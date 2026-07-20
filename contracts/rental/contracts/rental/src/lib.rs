#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, token, IntoVal,
};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RentalStatus {
    Available = 0,
    Rented = 1,
    Returned = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Equipment {
    pub id: u32,
    pub owner: Address,
    pub title: String,
    pub description: String,
    pub price_per_day: i128,
    pub deposit: i128,
    pub status: RentalStatus,
    pub renter: Option<Address>,
    pub rental_days: u32,
    pub rent_start_time: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    TotalEquipment,
    Equipment(u32),
    ReviewRegistry,
}

#[contract]
pub struct RentalContract;

#[contractimpl]
impl RentalContract {
    /// Initialize the contract with an admin and the payment token address (e.g. native SAC or custom token)
    pub fn init(env: Env, admin: Address, token_address: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token_address);
        env.storage().instance().set(&DataKey::TotalEquipment, &0u32);
    }

    /// Set the review registry contract address (Admin only)
    pub fn set_review_registry(env: Env, review_registry: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| panic!("not initialized"));
        admin.require_auth();
        env.storage().instance().set(&DataKey::ReviewRegistry, &review_registry);
    }

    /// Upgrade contract WASM source code (Admin only)
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| panic!("not initialized"));
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// List a new piece of equipment for rent
    pub fn list_equipment(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        price_per_day: i128,
        deposit: i128,
    ) -> u32 {
        owner.require_auth();

        if price_per_day <= 0 {
            panic!("price must be positive");
        }
        if deposit < 0 {
            panic!("deposit cannot be negative");
        }

        let mut total: u32 = env.storage().instance().get(&DataKey::TotalEquipment).unwrap_or(0);
        total += 1;
        env.storage().instance().set(&DataKey::TotalEquipment, &total);

        let equipment = Equipment {
            id: total,
            owner: owner.clone(),
            title: title.clone(),
            description: description.clone(),
            price_per_day,
            deposit,
            status: RentalStatus::Available,
            renter: None,
            rental_days: 0,
            rent_start_time: 0,
        };

        // Store in persistent storage
        let key = DataKey::Equipment(total);
        env.storage().persistent().set(&key, &equipment);

        // Emit list event
        env.events().publish(
            (symbol_short!("listed"), total, owner.clone()),
            (title, price_per_day, deposit),
        );

        total
    }

    /// Rent a piece of equipment for a specified number of days
    pub fn rent_equipment(env: Env, renter: Address, id: u32, days: u32) {
        renter.require_auth();

        if days == 0 {
            panic!("duration must be at least 1 day");
        }

        let key = DataKey::Equipment(id);
        let mut equipment: Equipment = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("equipment not found"));

        if equipment.status != RentalStatus::Available {
            panic!("equipment is not available");
        }

        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_address);

        let rent_payment = equipment.price_per_day * (days as i128);
        let total_charge = rent_payment + equipment.deposit;

        // Escrow the tokens inside the contract
        token_client.transfer(&renter, &env.current_contract_address(), &total_charge);

        // Update equipment status and renter details
        equipment.status = RentalStatus::Rented;
        equipment.renter = Some(renter.clone());
        equipment.rental_days = days;
        equipment.rent_start_time = env.ledger().timestamp();

        env.storage().persistent().set(&key, &equipment);

        // Emit rent event
        env.events().publish(
            (symbol_short!("rented"), id, renter),
            (days, rent_payment, equipment.deposit),
        );
    }

    /// Renter signals return of the equipment, pending owner inspection and resolution
    pub fn return_equipment(env: Env, renter: Address, id: u32) {
        renter.require_auth();

        let key = DataKey::Equipment(id);
        let mut equipment: Equipment = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("equipment not found"));

        if equipment.status != RentalStatus::Rented {
            panic!("equipment is not currently rented");
        }

        let eq_renter = equipment.renter.as_ref().unwrap_or_else(|| panic!("no renter found"));
        if *eq_renter != renter {
            panic!("only the current renter can return this equipment");
        }

        equipment.status = RentalStatus::Returned;
        env.storage().persistent().set(&key, &equipment);

        // Emit return event
        env.events().publish(
            (symbol_short!("returned"), id, renter),
            (),
        );
    }

    /// Owner inspects equipment, refunds the security deposit (minus damages), and collects rental payout
    pub fn resolve_rental(
        env: Env,
        owner: Address,
        id: u32,
        refund_deposit: i128,
        claim_deposit: i128,
    ) {
        owner.require_auth();

        let key = DataKey::Equipment(id);
        let mut equipment: Equipment = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("equipment not found"));

        if equipment.status != RentalStatus::Returned {
            panic!("equipment is not in returned status");
        }

        if equipment.owner != owner {
            panic!("only the equipment owner can resolve the rental");
        }

        if refund_deposit < 0 || claim_deposit < 0 {
            panic!("deposit distributions must be non-negative");
        }

        if refund_deposit + claim_deposit != equipment.deposit {
            panic!("sum of refund and claim must equal the original deposit");
        }

        let renter = equipment.renter.clone().unwrap_or_else(|| panic!("no renter found"));

        // Register completed rental with ReviewRegistry if set
        if env.storage().instance().has(&DataKey::ReviewRegistry) {
            let registry_addr: Address = env.storage().instance().get(&DataKey::ReviewRegistry).unwrap();
            env.invoke_contract::<()>(
                &registry_addr,
                &Symbol::new(&env, "register_completed_rental"),
                (id, id, renter.clone(), owner.clone()).into_val(&env)
            );
        }

        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_address);

        let rent_payment = equipment.price_per_day * (equipment.rental_days as i128);

        // 1. Payout the refund_deposit back to the renter (if any)
        if refund_deposit > 0 {
            token_client.transfer(&env.current_contract_address(), &renter, &refund_deposit);
        }

        // 2. Payout rent_payment + claim_deposit to the owner
        let owner_payout = rent_payment + claim_deposit;
        if owner_payout > 0 {
            token_client.transfer(&env.current_contract_address(), &owner, &owner_payout);
        }

        // Reset the equipment back to Available
        equipment.status = RentalStatus::Available;
        equipment.renter = None;
        equipment.rental_days = 0;
        equipment.rent_start_time = 0;

        env.storage().persistent().set(&key, &equipment);

        // Emit resolve event
        env.events().publish(
            (symbol_short!("resolved"), id, owner),
            (renter, refund_deposit, claim_deposit),
        );
    }

    /// Read equipment state
    pub fn get_equipment(env: Env, id: u32) -> Option<Equipment> {
        let key = DataKey::Equipment(id);
        env.storage().persistent().get(&key)
    }

    /// Read total equipment listed
    pub fn get_total_equipment(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalEquipment).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests;

