## Administrator

_Use case_: Call POST `/auth/register/admin` endpoint
- **Given that**: I'm a new user who wants to register as an administrator
  - **When**: I fill out the registration form with valid information (`CreateAdminDto`) and submit it
    - **Then**:
      - [ ] It should create a new administrator user profile, ignoring fields not specified in `CreateAdminDto`
      - [ ] It should return a 201 Created response with a valid access token and my user information in the response body
  - **When**: I fill out the registration form with an email that is already registered and submit it
    - **Then**:
      - [ ] It should not create a new administrator user profile
      - [ ] It should return a 400 Bad Request response with an error message indicating that the email is already in use
  - **When**: I fill out the registration form with a password and passwordRepeat that do not match and submit it
    - **Then**:
      - [ ] It should not create a new administrator user profile
      - [ ] It should return a 400 Bad Request response with an error message indicating that the passwords do not match
  - **When**: I fill out the registration form with invalid values for one or more fields in `CreateAdminDto` in the request body
    - **Then**:
      - [ ] It should not create a new administrator user profile
      - [ ] It should return a 400 Bad Request response with an error message list indicating which fields are invalid

_Use case_: Call GET `/admins` endpoint
- **Given that**: I'm an existing administrator user of the platform who wants to access the GET `/admins` endpoint
  - **When**: I make a request to the GET `/admins` endpoint with a valid access token with 1 or more administrator users in the system
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a successful response with a list of all administrator users in the system

_Use case_: Call GET `/admins/:id` endpoint
- **Given that**: I'm an existing administrator user of the platform who wants to access the GET `/admins/:id` endpoint
  - **When**: I make a request to the GET `/admins/:id` endpoint with a valid access token and a valid administrator user ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a successful response with the information of the specified administrator user
  - **When**: I make a request to the GET `/admins/:id` endpoint with a valid access token and an invalid ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message indicating that the specified ID is malformed
  - **When**: I make a request to the GET `/admins/:id` endpoint with a valid access token and a non-existent administrator user ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 404 Not Found response with an error message indicating that the specified administrator user was not found

_Use case_: Call PATCH `/admins/:id` endpoint
- **Given that**: I'm an existing administrator user of the platform who wants to update an administrator profile
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a valid administrator user ID that matches my own ID, and valid updated information in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should update the specified administrator user's profile information with the provided data
      - [ ] It should return a successful response with the updated information of the specified administrator user
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a valid administrator user ID that matches my own ID, and a password and passwordRepeat that do not match in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message indicating that the passwords do not match
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a valid administrator user ID that matches my own ID, and an email that is already registered by another user in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message indicating that the email is already in use
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, an invalid ID, and valid updated information in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message indicating that the specified ID is malformed
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a valid administrator user ID that matches my own ID, using wrong type values for one or more fields in `UpdateAdminDto` in the request body
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message list indicating which fields are invalid
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a valid administrator user ID that does not match my own ID, and valid updated information in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 403 Forbidden response with an error message indicating that I don't have permission to perform this action
  - **When**: I make a request to the PATCH `/admins/:id` endpoint with a valid access token, a non-existent administrator user ID, and valid updated information in the request body (`UpdateAdminDto`)
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 404 Not Found response with an error message indicating that the specified administrator user was not found

_Use case_: Call DELETE `/admins/:id` endpoint
- **Given that**: I'm an existing administrator user of the platform who wants to delete an administrator profile
  - **When**: I make a request to the DELETE `/admins/:id` endpoint with a valid access token and a valid administrator user ID that matches my own ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should soft delete the specified administrator user profile
      - [ ] It should return a successful response indicating that the administrator user was deleted
  - **When**: I make a request to the DELETE `/admins/:id` endpoint with a valid access token and an invalid ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 400 Bad Request response with an error message indicating that the specified ID is malformed
  - **When**: I make a request to the DELETE `/admins/:id` endpoint with a valid access token and a valid administrator user ID that does not match my own ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 403 Forbidden response with an error message indicating that I don't have permission to perform this action
  - **When**: I make a request to the DELETE `/admins/:id` endpoint with a valid access token and a non-existent administrator user ID
    - **Then**:
      - [ ] It should authorize my access
      - [ ] It should return a 404 Not Found response with an error message indicating that the specified administrator user was not found