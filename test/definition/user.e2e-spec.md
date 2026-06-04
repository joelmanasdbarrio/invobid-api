# User

_Use case_: Call POST `/auth/login` endpoint
- **Given that**: I'm an existing user of the platform who wants to log in
  - **When**: I fill out the login form with valid minimal information (`LoginUserDto`) and submit it
    - **Then**:
      - [ ] It should authenticate my credentials
      - [ ] It should create a valid access token with 1 day expiration time
      - [ ] It should return a 200 OK response with a valid access token and my user information in the response body
  - **When**: I fill out the login form with valid information (`LoginUserDto`) + rememberMe option and submit it
    - **Then**:
      - [ ] It should authenticate my credentials
      - [ ] It should create a valid access token with 30 days expiration time
      - [ ] It should return a 200 OK response with a valid access token and my user information in the response body
  - **When**: I fill out the login form with missing email and/or password and submit it
    - **Then**:
      - [ ] It should not authenticate my credentials
      - [ ] It should return a 400 Bad Request response with an error message indicating that email and password are required
  - **When**: I fill out the login form with an incorrect email or password and submit it
    - **Then**:
      - [ ] It should not authenticate my credentials
      - [ ] It should return a 401 Unauthorized response with an error message indicating credentials are invalid
  - **When**: I fill out the login form with email and password and subtmit it but my user account is soft deleted
    - **Then**:
      - [ ] It should not authenticate my credentials
      - [ ] It should return a 423 Locked response with an error message indicating the account is locked
  - **When**: I fill out the login form with valid information (`LoginUserDto`), and include `x-activate-account=true` header and subtmit it while my user account is soft deleted
    - **Then**:
      - [ ] It should authenticate my credentials
      - [ ] It should reactivate my user account by removing the deletedAt timestamp
      - [ ] It should return a 200 OK response with a valid access token and my user information in the response body

_Use case_: Call protected endpoint
- **Given that**: I'm an existing user of the platform who wants to access a protected endpoint
  - **When**: I make a request to a protected endpoint with a valid access token
    - **Then**:
      - [ ] It should authenticate my credentials
      - [ ] It should proceed to call next expected action for that endpoint successfully
  - **When**: I make a request to a protected endpoint with an invalid access token (expired or missing)
    - **Then**:
      - [ ] It should not authenticate my credentials
      - [ ] It should return a 401 Unauthorized response with an error message indicating the access token is invalid

_Use case_: Call role-protected (`UserType`) endpoint
- **Given that**: I'm an existing user of the platform who wants to access a role-protected (`UserType`) endpoint
  - **When**: I make a request to a role-protected (`UserType`) endpoint that does not match my current role with a valid access token
    - **Then**:
      - [ ] It should not authorize my access
      - [ ] It should return a 403 Forbidden response with an error message indicating that I do not have the necessary permissions to perform this action
  - **When**: I make a request to a role-protected (`UserType`) endpoint that matches my current role with a valid access token
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should proceed to call next expected action for that endpoint successfully

[Administrator users](admin-user.e2e-spec.md)
[Investor users](investor-user.e2e-spec.md)