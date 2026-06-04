_Use case_: Call ANY endpoint while the database service is down
- **Given that**: I'm an existing user of the platform who wants to access any endpoint
  - **When**: I make a request to any endpoint with a valid access token while the database service is down
    - **Then**:
      - [ ] It should fail to authenticate my access
      - [ ] It should return a 503 Service Unavailable response with an error message indicating that a service is currently unavailable

[Users](user.e2e-spec.md)
[Debtors](debtor.e2e-spec.md)
[Invoices](invoice.e2e-spec.md)
[Auctions](auction.e2e-spec.md)
[Bids](bid.e2e-spec.md)