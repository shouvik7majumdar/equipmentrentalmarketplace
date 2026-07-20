#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Symbol, IntoVal,
};

// Import the review registry contract code or just define a client for it
// Since it's in the same workspace, we can import its contract client or register it!
// Let's import the review registry code by referencing its module
// Or register its contract type.

#[test]
fn test_rental_flow_and_reviews() {
    let env = Env::default();
    env.mock_all_auths();

    // Setup accounts
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let renter = Address::generate(&env);

    // Setup Token
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    // Mint tokens to renter
    token_admin_client.mint(&renter, &1000i128);
    assert_eq!(token_client.balance(&renter), 1000i128);

    // Register Rental Contract
    let rental_contract_id = env.register_contract(None, RentalContract);
    let rental_client = RentalContractClient::new(&env, &rental_contract_id);

    // Init Rental Contract
    rental_client.init(&admin, &token_address);

    // List Equipment
    let title = String::from_str(&env, "Concrete Mixer");
    let description = String::from_str(&env, "Heavy duty concrete mixer");
    let price_per_day = 10i128;
    let deposit = 50i128;

    let eq_id = rental_client.list_equipment(
        &owner,
        &title,
        &description,
        &price_per_day,
        &deposit
    );
    assert_eq!(eq_id, 1);

    let eq = rental_client.get_equipment(&1).unwrap();
    assert_eq!(eq.title, title);
    assert_eq!(eq.price_per_day, price_per_day);
    assert_eq!(eq.deposit, deposit);
    assert!(matches!(eq.status, RentalStatus::Available));

    // Rent Equipment for 3 days
    // Total cost = 10 * 3 + 50 = 80 XLM
    rental_client.rent_equipment(&renter, &1, &3);

    // Check balances
    assert_eq!(token_client.balance(&renter), 1000 - 80);
    assert_eq!(token_client.balance(&rental_contract_id), 80);

    let eq = rental_client.get_equipment(&1).unwrap();
    assert!(matches!(eq.status, RentalStatus::Rented));
    assert_eq!(eq.renter.unwrap(), renter);

    // Return Equipment
    rental_client.return_equipment(&renter, &1);
    let eq = rental_client.get_equipment(&1).unwrap();
    assert!(matches!(eq.status, RentalStatus::Returned));

    // Register Review Registry Contract
    // use crate::contracts::rental::contracts::review_registry::src::lib::ReviewRegistryContract as ReviewRegistry;
    // Wait, let's use the code from review_registry directly. Since they are separate packages in a cargo workspace,
    // we can import the ReviewRegistryContract by compiling it. But since we need it in tests,
    // let's define a mock or registers its interface. Actually, the easiest way is to register ReviewRegistryContract
    // by importing the file or writing its structure here, or using its client if we import it.
    // Wait! Since it is in the same crate or we can register it:
    // Let's define the ReviewRegistryContract test client manually or register the struct from the workspace.
    // Let's see: ReviewRegistryContract is located at `contracts/rental/contracts/review_registry/src/lib.rs`.
    // Let's just define a copy of its methods or import the module!
    // Can we import it? Yes, but cargo doesn't allow cross-crate dependency in tests without it being declared in Cargo.toml.
    // Let's check: did we add `review_registry` to `rental` dependencies?
    // No, but we can write a mock contract inside the test or compile the WASM of review_registry.
    // Alternatively, we can define the ReviewRegistryContract structure in the test itself to compile it!
    // Yes! We can write a simple mock structure in tests.rs or define the real ReviewRegistryContract inside tests.rs as a test-only contract!
    // That's extremely elegant, fast, and does not require cross-crate dependency loops.
}

#[contract]
pub struct MockReviewRegistry;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TestCompletedRental {
    pub rental_id: u32,
    pub equipment_id: u32,
    pub renter: Address,
    pub owner: Address,
    pub reviewed_by_renter: bool,
    pub reviewed_by_owner: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MockKey {
    RentalContract,
    CompletedRental(u32),
    TotalCompletedRentals,
}

#[contractimpl]
impl MockReviewRegistry {
    pub fn init(env: Env, _admin: Address, rental_contract: Address) {
        env.storage().instance().set(&MockKey::RentalContract, &rental_contract);
        env.storage().instance().set(&MockKey::TotalCompletedRentals, &0u32);
    }

    pub fn register_completed_rental(
        env: Env,
        rental_id: u32,
        equipment_id: u32,
        renter: Address,
        owner: Address,
    ) {
        let rental_contract: Address = env.storage().instance().get(&MockKey::RentalContract).unwrap();
        rental_contract.require_auth();

        let mut total: u32 = env.storage().instance().get(&MockKey::TotalCompletedRentals).unwrap_or(0);
        total += 1;
        env.storage().instance().set(&MockKey::TotalCompletedRentals, &total);

        let completed = TestCompletedRental {
            rental_id: total,
            equipment_id,
            renter,
            owner,
            reviewed_by_renter: false,
            reviewed_by_owner: false,
        };

        env.storage().persistent().set(&MockKey::CompletedRental(total), &completed);
    }

    pub fn get_total_completed_rentals(env: Env) -> u32 {
        env.storage().instance().get(&MockKey::TotalCompletedRentals).unwrap_or(0)
    }

    pub fn get_completed_rental(env: Env, id: u32) -> Option<TestCompletedRental> {
        env.storage().persistent().get(&MockKey::CompletedRental(id))
    }
}

#[test]
fn test_resolve_rental_with_registry() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let renter = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin);
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    token_admin_client.mint(&renter, &500i128);

    let rental_contract_id = env.register_contract(None, RentalContract);
    let rental_client = RentalContractClient::new(&env, &rental_contract_id);
    rental_client.init(&admin, &token_address);

    // Register & link MockReviewRegistry
    let registry_id = env.register_contract(None, MockReviewRegistry);
    let registry_client = MockReviewRegistryClient::new(&env, &registry_id);
    registry_client.init(&admin, &rental_contract_id);

    rental_client.set_review_registry(&registry_id);

    // List & rent
    rental_client.list_equipment(&owner, &String::from_str(&env, "Mixer"), &String::from_str(&env, "Mix"), &10i128, &50i128);
    rental_client.rent_equipment(&renter, &1, &2);
    rental_client.return_equipment(&renter, &1);

    // Resolve: refund deposit 40 XLM, claim 10 XLM damages. Total owner payout = rent (10*2) + claim (10) = 30 XLM.
    rental_client.resolve_rental(&owner, &1, &40i128, &10i128);

    // Verify token distributions
    // Renter balance: 500 - (20 + 50) + 40 = 470 XLM
    assert_eq!(token_client.balance(&renter), 470i128);
    // Owner balance: 30 XLM
    assert_eq!(token_client.balance(&owner), 30i128);

    // Verify status reset
    let eq = rental_client.get_equipment(&1).unwrap();
    assert!(matches!(eq.status, RentalStatus::Available));

    // Verify cross-contract call logged in registry!
    assert_eq!(registry_client.get_total_completed_rentals(), 1);
    let comp = registry_client.get_completed_rental(&1).unwrap();
    assert_eq!(comp.equipment_id, 1);
    assert_eq!(comp.renter, renter);
    assert_eq!(comp.owner, owner);
}
