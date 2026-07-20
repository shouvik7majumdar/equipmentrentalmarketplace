#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, IntoVal,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompletedRental {
    pub rental_id: u32,
    pub equipment_id: u32,
    pub renter: Address,
    pub owner: Address,
    pub reviewed_by_renter: bool,
    pub reviewed_by_owner: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Review {
    pub rental_id: u32,
    pub reviewer: Address,
    pub reviewee: Address,
    pub rating: u32,
    pub comment: String,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserReputation {
    pub owner_rating_sum: u32,
    pub owner_review_count: u32,
    pub renter_rating_sum: u32,
    pub renter_review_count: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    RentalContract,
    CompletedRental(u32),
    Review(u32, Address),
    Reputation(Address),
    TotalReviews,
    TotalCompletedRentals,
}

#[contract]
pub struct ReviewRegistryContract;

#[contractimpl]
impl ReviewRegistryContract {
    /// Initialize the contract with an admin and the main rental contract address
    pub fn init(env: Env, admin: Address, rental_contract: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RentalContract, &rental_contract);
        env.storage().instance().set(&DataKey::TotalReviews, &0u32);
        env.storage().instance().set(&DataKey::TotalCompletedRentals, &0u32);
    }

    /// Register a completed rental sequence. Can only be invoked by the rental contract address.
    pub fn register_completed_rental(
        env: Env,
        rental_id: u32,
        equipment_id: u32,
        renter: Address,
        owner: Address,
    ) {
        let rental_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::RentalContract)
            .unwrap_or_else(|| panic!("not initialized"));
        
        rental_contract.require_auth();

        let mut total: u32 = env.storage().instance().get(&DataKey::TotalCompletedRentals).unwrap_or(0);
        total += 1;
        env.storage().instance().set(&DataKey::TotalCompletedRentals, &total);

        let completed = CompletedRental {
            rental_id: total, // Use sequence sequence count as completed rental transaction ID
            equipment_id,
            renter,
            owner,
            reviewed_by_renter: false,
            reviewed_by_owner: false,
        };

        let key = DataKey::CompletedRental(total);
        env.storage().persistent().set(&key, &completed);

        // Emit registered event
        env.events().publish(
            (Symbol::new(&env, "registered"), total),
            (rental_id, equipment_id, completed.renter.clone(), completed.owner.clone()),
        );
    }

    /// Submit rating and review comment for a completed rental. Renter reviews owner, or owner reviews renter.
    pub fn submit_review(
        env: Env,
        reviewer: Address,
        completed_rental_id: u32,
        rating: u32,
        comment: String,
    ) {
        reviewer.require_auth();

        if rating < 1 || rating > 5 {
            panic!("rating must be between 1 and 5");
        }

        let rental_key = DataKey::CompletedRental(completed_rental_id);
        let mut completed: CompletedRental = env
            .storage()
            .persistent()
            .get(&rental_key)
            .unwrap_or_else(|| panic!("completed rental not found"));

        let is_renter = completed.renter == reviewer;
        let is_owner = completed.owner == reviewer;

        if !is_renter && !is_owner {
            panic!("reviewer must be renter or owner");
        }

        let review_key = DataKey::Review(completed_rental_id, reviewer.clone());
        if env.storage().persistent().has(&review_key) {
            panic!("already reviewed");
        }

        let (reviewee, is_reviewer_renter) = if is_renter {
            if completed.reviewed_by_renter {
                panic!("already reviewed by renter");
            }
            completed.reviewed_by_renter = true;
            (completed.owner.clone(), true)
        } else {
            if completed.reviewed_by_owner {
                panic!("already reviewed by owner");
            }
            completed.reviewed_by_owner = true;
            (completed.renter.clone(), false)
        };

        env.storage().persistent().set(&rental_key, &completed);

        let review = Review {
            rental_id: completed_rental_id,
            reviewer: reviewer.clone(),
            reviewee: reviewee.clone(),
            rating,
            comment: comment.clone(),
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&review_key, &review);

        let rep_key = DataKey::Reputation(reviewee.clone());
        let mut rep: UserReputation = env
            .storage()
            .persistent()
            .get(&rep_key)
            .unwrap_or(UserReputation {
                owner_rating_sum: 0,
                owner_review_count: 0,
                renter_rating_sum: 0,
                renter_review_count: 0,
            });

        if is_reviewer_renter {
            rep.owner_rating_sum += rating;
            rep.owner_review_count += 1;
        } else {
            rep.renter_rating_sum += rating;
            rep.renter_review_count += 1;
        }
        env.storage().persistent().set(&rep_key, &rep);

        let mut total_reviews: u32 = env.storage().instance().get(&DataKey::TotalReviews).unwrap_or(0);
        total_reviews += 1;
        env.storage().instance().set(&DataKey::TotalReviews, &total_reviews);

        // Emit review event
        env.events().publish(
            (symbol_short!("reviewed"), completed_rental_id, reviewer),
            (reviewee, rating, comment),
        );
    }

    /// Retrieve a specific review details by completed rental ID and reviewer address
    pub fn get_review(env: Env, completed_rental_id: u32, reviewer: Address) -> Option<Review> {
        let key = DataKey::Review(completed_rental_id, reviewer);
        env.storage().persistent().get(&key)
    }

    /// Read reputation metrics for a specific user address
    pub fn get_reputation(env: Env, user: Address) -> Option<UserReputation> {
        let key = DataKey::Reputation(user);
        env.storage().persistent().get(&key)
    }

    /// Read completed rental transaction details
    pub fn get_completed_rental(env: Env, completed_rental_id: u32) -> Option<CompletedRental> {
        let key = DataKey::CompletedRental(completed_rental_id);
        env.storage().persistent().get(&key)
    }

    /// Read total completed rentals counter
    pub fn get_total_completed_rentals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalCompletedRentals).unwrap_or(0)
    }

    /// Upgrade contract WASM source code (Admin only)
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| panic!("not initialized"));
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}

#[cfg(test)]
mod tests;

