#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String, Symbol, IntoVal,
};

#[test]
fn test_review_registry_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let rental_contract = Address::generate(&env);
    let owner = Address::generate(&env);
    let renter = Address::generate(&env);

    // Register registry contract
    let registry_id = env.register_contract(None, ReviewRegistryContract);
    let registry_client = ReviewRegistryContractClient::new(&env, &registry_id);

    // Init
    registry_client.init(&admin, &rental_contract);

    // Register a completed rental from the rental contract
    // We mock that rental_contract is the caller, so we sign as rental_contract
    // In our test, because of mock_all_auths, calling it will succeed and mock the auth of rental_contract
    registry_client.register_completed_rental(&1, &10, &renter, &owner);

    assert_eq!(registry_client.get_total_completed_rentals(), 1);

    let completed = registry_client.get_completed_rental(&1).unwrap();
    assert_eq!(completed.rental_id, 1);
    assert_eq!(completed.equipment_id, 10);
    assert_eq!(completed.renter, renter);
    assert_eq!(completed.owner, owner);
    assert!(!completed.reviewed_by_renter);
    assert!(!completed.reviewed_by_owner);

    // Submit review by renter (rating 5)
    let comment = String::from_str(&env, "Excellent rental!");
    registry_client.submit_review(&renter, &1, &5, &comment);

    // Verify review was saved
    let review = registry_client.get_review(&1, &renter).unwrap();
    assert_eq!(review.rating, 5);
    assert_eq!(review.comment, comment);
    assert_eq!(review.reviewer, renter);
    assert_eq!(review.reviewee, owner);

    // Verify owner reputation updated
    let rep = registry_client.get_reputation(&owner).unwrap();
    assert_eq!(rep.owner_rating_sum, 5);
    assert_eq!(rep.owner_review_count, 1);
    assert_eq!(rep.renter_rating_sum, 0);
    assert_eq!(rep.renter_review_count, 0);

    // Verify double review by renter fails
    let fail_comment = String::from_str(&env, "Another review");
    let res = registry_client.try_submit_review(&renter, &1, &4, &fail_comment);
    assert!(res.is_err());

    // Submit review by owner (rating 4)
    let owner_comment = String::from_str(&env, "Great renter, took good care.");
    registry_client.submit_review(&owner, &1, &4, &owner_comment);

    // Verify renter reputation updated
    let rep = registry_client.get_reputation(&renter).unwrap();
    assert_eq!(rep.renter_rating_sum, 4);
    assert_eq!(rep.renter_review_count, 1);
    assert_eq!(rep.owner_rating_sum, 0);
    assert_eq!(rep.owner_review_count, 0);
}

#[test]
#[should_panic(expected = "rating must be between 1 and 5")]
fn test_invalid_rating_bounds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let rental_contract = Address::generate(&env);
    let owner = Address::generate(&env);
    let renter = Address::generate(&env);

    let registry_id = env.register_contract(None, ReviewRegistryContract);
    let registry_client = ReviewRegistryContractClient::new(&env, &registry_id);
    registry_client.init(&admin, &rental_contract);

    registry_client.register_completed_rental(&1, &10, &renter, &owner);

    let comment = String::from_str(&env, "Too high");
    registry_client.submit_review(&renter, &1, &6, &comment);
}

#[test]
#[should_panic(expected = "reviewer must be renter or owner")]
fn test_non_participant_review() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let rental_contract = Address::generate(&env);
    let owner = Address::generate(&env);
    let renter = Address::generate(&env);
    let interloper = Address::generate(&env);

    let registry_id = env.register_contract(None, ReviewRegistryContract);
    let registry_client = ReviewRegistryContractClient::new(&env, &registry_id);
    registry_client.init(&admin, &rental_contract);

    registry_client.register_completed_rental(&1, &10, &renter, &owner);

    let comment = String::from_str(&env, "Sneaking in a review");
    registry_client.submit_review(&interloper, &1, &5, &comment);
}
