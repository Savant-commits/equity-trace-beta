# EquityTrace — Full Codebase Security Audit and Refactoring

## Project context

Repository: https://github.com/Savant-commits/equity-trace-beta.git

EquityTrace is a trading journal and analytics SaaS application. It tracks trades, prop-firm accounts, trading performance, playbooks, screenshots, reports, and user settings.

Known infrastructure:
- Frontend: Vite with vanilla JavaScript and DOM-driven UI
- Backend/database: Supabase
- Authentication: Supabase Auth
- Hosting: Vercel
- Domain: equitytrace.in, managed through GoDaddy and Cloudflare DNS
- Product analytics: PostHog
- PWA: service worker, manifest, and offline support

The current codebase has accumulated technical debt, inconsistent data handling, incomplete features, and potential security issues. Your job is to audit the entire repository, fix verified problems, and make the architecture maintainable without destroying existing functionality or user data.

## Operating rules

1. Begin with a complete audit. Do not immediately rewrite the application.
2. Read the entire repository, including all JavaScript, HTML, CSS, SQL, configuration, deployment files, dependencies, and documentation.
3. Trace critical execution paths across files instead of reviewing each file in isolation.
4. Do not assume that the checked-in SQL schema matches the production Supabase database.
5. Never delete user data, reset production tables, expose credentials, or execute destructive production migrations.
6. Preserve existing product functionality and UI behavior unless a change is necessary to correct a documented bug or security issue.
7. Do not migrate frameworks or introduce unnecessary dependencies merely to make the code look modern.
8. Do not claim a vulnerability is fixed until the change has been tested.
9. Never silently swallow important errors or report successful operations that did not succeed.
10. Work in small, reviewable stages. Explain the findings, proposed changes, and risks before large or destructive changes.

## Phase 1 — Repository inventory

Map the complete codebase.

Identify:
- Application entry points and script-loading order
- Every feature module and its responsibilities
- Authentication and authorization flows
- Supabase client initialization and all database operations
- SQL tables, indexes, constraints, triggers, RLS policies, and RPC functions
- Local storage and cloud synchronization paths
- CSV/import/export functionality
- Screenshot storage and rendering
- Analytics and reporting calculations
- PostHog events and initialization
- Service-worker caching, offline behavior, and PWA installation
- Vercel configuration, environment variables, external services, and dependencies
- Duplicate, obsolete, unused, stubbed, and conflicting implementations

Produce a dependency map showing which modules depend on one another and identify the most tightly coupled components.

## Phase 2 — Security audit

Investigate each category below. Search the entire repository, not only the files already known to contain problems.

### A. Cross-site scripting and unsafe DOM rendering

Inspect all uses of:
- innerHTML and outerHTML
- insertAdjacentHTML
- document.write
- Dynamic template literals
- Inline onclick and other event-handler attributes
- Dynamic URLs and HTML attributes
- User-provided strings rendered into charts, tooltips, tables, modals, and reports

Prioritize app.js, particularly the trade-table renderer and analytics functions that interpolate session names into HTML and inline JavaScript.

Trace all data sources, including imported trades, localStorage, Supabase records, user settings, account names, notes, playbook names, and image labels.

Replace unsafe rendering with DOM APIs and textContent wherever possible. Use context-appropriate escaping only when HTML generation is genuinely necessary. Remove inline JavaScript handlers in favor of registered event listeners.

Create regression tests for malicious strings, including HTML tags, event handlers, quotes, and JavaScript URL payloads.

Distinguish self-XSS from attacks involving attacker-controlled imported, shared, or remotely supplied data.

### B. Authentication and authorization

Review:
- Supabase session lifecycle and initialization
- Sign-up, sign-in, sign-out, and password-reset flows
- Password recovery and redirect URLs
- Auth-state changes and account switching
- User identity checks before every database operation
- Access to data after logout or session expiration
- Any admin or privileged functionality

Never rely on frontend checks alone for authorization.

### C. Supabase RLS and database security

Audit every table and RPC function in supabase_schema.sql and any other SQL files.

Verify:
- RLS is enabled on every user-data table.
- Policies correctly restrict SELECT, INSERT, UPDATE, and DELETE.
- UPDATE policies prevent users from transferring records to another user.
- Related records, particularly trade_images and trades, have consistent ownership.
- Anonymous access exposes only explicitly intended public data.
- SECURITY DEFINER functions have a safe owner, a fixed search_path, appropriate execution grants, and restricted data exposure.
- Functions do not unintentionally reveal private trade information, user identifiers, or account details.
- SQL migrations are versioned, safe to apply, and do not assume nonexistent production state.

Use two separate test users to test cross-user access. Attempt unauthorized reads, inserts, updates, deletes, and cross-account record references.

Do not weaken RLS to make broken application functionality work.

### D. Credentials and configuration

Inspect all tracked files and Git history for accidentally committed secrets, including service-role keys, API tokens, passwords, and database credentials.

Review:
- .env.example
- .env.local.example
- local-env.js.example
- Vite environment-variable handling
- Vercel configuration
- Browser-exposed variables
- PostHog configuration
- Build output and source maps

Report any suspected secret without reproducing its value in logs or reports. If an actual secret has been exposed, recommend revocation and rotation.

Do not incorrectly classify a Supabase anon/publishable key as a secret solely because it is visible in the browser. Verify the associated access controls.

### E. Input validation and abuse resistance

Validate all imported and user-provided data at the application boundary and enforce appropriate constraints in the database.

Check:
- Numeric fields, including NaN, Infinity, negative values, and precision
- Trade dates and times
- Direction and instrument types
- Position size, entry, exit, stop-loss, and take-profit values
- Account identifiers and legacy IDs
- CSV structure, malformed files, oversized imports, and duplicate records
- Image MIME types, dimensions, and payload sizes
- Oversized notes and settings
- RPC arguments and unexpected object properties

Do not impose trading rules that are not part of the product's intended behavior. Document the expected business rules before enforcing them.

### F. Privacy and analytics

Audit PostHog initialization and every event payload.

Ensure trade notes, screenshots, account balances, authentication tokens, and other sensitive data are not sent to analytics without an explicit, justified requirement.

Review event collection, user identification, consent behavior where applicable, and logout handling.

### G. Browser and deployment security

Review:
- Content Security Policy
- HTTPS and security headers
- Cross-origin policies and redirects
- Dependency and supply-chain risks
- Service-worker cache behavior
- Production error messages and logging
- Source-map exposure
- Authentication behavior in offline mode

Do not introduce a CSP that breaks the existing app. Identify inline scripts and styles that need migration before enforcing stricter policies.

## Phase 3 — Data integrity and synchronization

Treat this as a critical part of the audit.

### Investigate these known concerns

1. supabase.js calls trade and account upserts using the conflict target user_id,legacy_id. Verify that a matching unique constraint exists in the actual database. The checked-in schema does not currently define one.

2. The bulk synchronization flow in app.js saves localStorage data and starts an asynchronous cloud sync. Investigate race conditions, overlapping saves, silent failures, and inconsistent local/cloud state.

3. sbSavePlaybooks and sbSaveTradeImages use delete-then-insert patterns. Check deletion errors, insertion failures, concurrency, and possible data loss.

4. Local-storage migration catches errors separately across data categories. Verify that partial migrations can be safely retried without duplicating or losing records.

5. sbLoadPlaybooks returns null when the cloud has no records or loading fails. Determine whether this causes stale local data to overwrite valid cloud state.

6. Verify that trade_images cannot reference another user's trade.

7. Check every CRUD operation for stable identifiers, ownership filtering, correct error handling, and appropriate transaction boundaries.

### Required improvements

- Establish one clearly defined source-of-truth and synchronization strategy.
- Use stable UUIDs for cloud records.
- Preserve legacy IDs only where compatibility requires them.
- Design idempotent migration and retry operations.
- Prevent stale full-array writes from overwriting newer records.
- Make sync status visible to the user.
- Distinguish an empty database result from a failed database request.
- Use transactions or server-side atomic operations for multi-step changes.
- Never mark a backup or migration successful without verification.
- Add recovery and reconciliation procedures.

Do not modify production constraints or data until you have inspected the current schema, duplicate records, null legacy IDs, and migration history.

## Phase 4 — Application architecture

The main app.js is approximately 10,000 lines and contains substantial shared state and DOM-driven functionality.

Refactor incrementally into clear modules, with responsibilities such as:

- Authentication and session management
- Supabase client and configuration
- Trade repository and business logic
- Account management
- Playbooks and trade images
- Local storage and migration
- Synchronization and error recovery
- Dashboard and analytics
- Reports, imports, and exports
- Settings and user profiles
- UI components, navigation, and shared utilities

Requirements:
- Minimize global variables and implicit dependencies.
- Separate business logic from DOM rendering.
- Avoid duplicate implementations of the same functionality.
- Make state changes explicit.
- Use clear module interfaces and consistent naming.
- Keep functions small enough to test.
- Avoid unnecessary abstractions and premature framework migrations.
- Preserve existing routes, UI, keyboard interactions, and user workflows.

Review account.js, analytics.js, calendar.js, images.js, import-trades.js, reports.js, settings.js, summary.js, templates.js, and all other scripts for duplicated or conflicting responsibilities.

## Phase 5 — Trading calculations and product correctness

Verify the correctness and consistency of:
- Gross and net P&L
- Commissions and fees
- Win rate and breakeven treatment
- R-multiples and risk/reward
- Equity curves and running P&L
- Drawdown calculations
- Account filtering and combined trades
- Time-zone and session calculations
- Date-range filtering
- Imported trade normalization
- Summary statistics and best-model calculations
- Screenshot-to-trade associations

Compare calculations across app.js, analytics.js, reports.js, summary.js, and the SQL RPC functions.

Identify discrepancies before changing formulas. Write deterministic unit tests using known inputs and expected results.

Do not assume that every existing formula is correct simply because it is already in production.

## Phase 6 — Dependencies, tooling, and testing

Audit package.json and package-lock.json.

Determine which dependencies are used, which are redundant, and which have known vulnerabilities. Verify findings against current package advisories rather than guessing from package age or version alone.

Add appropriate tooling:
- JavaScript linting
- Formatting
- Unit tests
- SQL/RLS integration tests
- Build verification
- Browser-based regression tests for critical workflows
- Dependency auditing
- CI checks that prevent broken changes from merging

Keep dependency changes minimal. Verify the production build after every major refactoring stage.

## Phase 7 — Prioritized implementation

Create an audit report with the following fields for every finding:

- Unique ID
- Severity: Critical, High, Medium, Low, or Informational
- Confidence: Confirmed, Probable, or Unverified
- File and exact line numbers
- Root cause
- Reproduction steps or supporting evidence
- Security or business impact
- Recommended fix
- Required regression tests

Prioritize remediation in this order:

1. Exposed credentials and confirmed critical security vulnerabilities
2. Authentication, authorization, and RLS failures
3. Data loss, corruption, and synchronization defects
4. XSS and unsafe data rendering
5. Broken database operations and incomplete features
6. Incorrect trading calculations
7. Architecture, dependencies, and maintainability
8. Performance and non-critical cleanup

For each change:
1. Explain the issue.
2. Identify the files affected.
3. Implement the smallest safe fix.
4. Add or update tests.
5. Run the relevant tests and production build.
6. Report the results and remaining risks.

Do not make large, unrelated changes in one step. Maintain a working application throughout the refactor.

## Phase 8 — Final deliverables

Produce:

1. AUDIT.md — full findings and severity rankings.
2. SECURITY.md — security assumptions, controls, and operational recommendations.
3. ARCHITECTURE.md — current architecture and the proposed module structure.
4. A versioned database migration plan.
5. Automated regression and security tests.
6. A dependency audit report.
7. A changelog of all implemented fixes.
8. A list of unresolved issues and manual checks requiring Supabase or Vercel access.

At completion, report:
- What was fixed
- What was only investigated
- Which tests passed and failed
- Whether the production build succeeds
- Whether database changes were applied or merely prepared
- Which actions still require my approval or access to external services

## Final instruction

Prioritize security, correctness, and preservation of existing user data over speed.

Do not fabricate test results, do not hide failed checks, do not claim production security without evidence, and do not perform destructive actions without explicit approval.

Start with the repository inventory and audit report. Then proceed through the remediation phases in small, verifiable increments.



Some of the identified issues are : 
1. Potential DOM-based / stored XSS
High priority
app.js builds HTML using template literals and assigns it to innerHTML. The trade table inserts fields such as t.symbol and t.account directly into markup. Another analytics renderer interpolates session names into both HTML and inline JavaScript event handlers. 

GitHub
+1



Why it matters: Malicious values supplied through imported or stored data could become executable markup or JavaScript. The actual exploitability depends on the data source and execution context.
Fix: Replace unsafe HTML construction with DOM APIs and textContent; remove inline event handlers; validate inputs; and audit every dynamic HTML sink. Escaping must match the context where data is inserted.




2. Bulk database upserts may fail
High priority
supabase.js calls .upsert() with onConflict: 'user_id,legacy_id' for trades and accounts. However, the checked-in SQL schema does not define a matching unique constraint or unique index on those columns. 

GitHub
+1



Why it matters: PostgreSQL upserts require a matching unique constraint/index for the specified conflict target. If the live database has no additional constraint, these operations will fail.
Fix: Inspect the live database and migration history. Add appropriate constraints only after resolving existing duplicate and null legacy IDs, or redesign synchronization around stable UUIDs.




3. Public-profile functionality is stubbed out
sbLoadOwnPublicProfile() always returns null, sbSavePublicProfile() always returns true, and sbGetPublicTraderStats() always returns null. The SQL schema contains a public-profile stats RPC, but the JavaScript client does not actually call it. 

GitHub
+1



Why it matters: The client can report a successful save without persisting anything. This creates false success states and broken functionality.
Fix: Implement the operations properly, with error handling and matching database permissions, or explicitly disable/remove the unfinished feature.




4. Destructive, non-transactional replacement of records
sbSavePlaybooks() deletes the user's existing playbooks and then inserts replacements. sbSaveTradeImages() follows a similar delete-then-insert pattern. The deletion errors are not checked before proceeding. 

GitHub
+1



Why it matters: If insertion fails after deletion, data can be lost. Concurrent saves can also interfere with one another.
Fix: Use transactional server-side operations or safe upserts. Check every database error, and preserve the previous state when a replacement fails.




5. Database isolation needs verification
The SQL schema enables Row Level Security (RLS) on profiles, trades, accounts, trade images, playbooks, and settings. It defines ownership policies, which is a good foundation. However, the image policies validate the image row's user_id without explicitly checking that the referenced trade belongs to the same user. 

GitHub
+1



Why it matters: The relationship between an image and its parent trade should be enforced, not merely the ownership of the image record.
Fix: Add database-level ownership integrity, such as an appropriate composite foreign key, and/or an RLS check that validates ownership of the referenced trade. Test cross-user reads, inserts, updates, and deletes using separate authenticated accounts.




6. Local storage and cloud synchronization can diverge
app.js persists trades to localStorage and initiates a full trade synchronization to Supabase after saving. The sync runs asynchronously, and failures are logged rather than surfaced as a clear, recoverable sync state. 

GitHub
+1



Why it matters: Local and cloud data can disagree; overlapping saves may race; users may assume their data is safely backed up when synchronization has failed.
Fix: Introduce a defined synchronization model, stable record IDs, explicit loading/sync/error states, retry behavior, and conflict handling. Never silently treat a failed cloud write as a successful backup.




7. Migration completion is not sufficiently robust
The local-storage migration catches errors per data category, and sets et_sb_migrated only when no errors were collected. That is better than marking a failed migration complete, but there is no visible transactional guarantee across categories. 

GitHub
+1



Why it matters: A partially completed migration can leave some data in the cloud and some only in the browser. Retrying without idempotent operations can introduce further inconsistencies.
Fix: Make migrations idempotent, report progress per category, verify record counts, and preserve an exportable backup until reconciliation succeeds.




8. Excessively coupled application architecture
The repository's main app.js is approximately 10,000 lines. The project also has numerous separate feature scripts and a large SQL schema, while the client uses global functions and shared state. 

GitHub
+2



Why it matters: Changes can cause regressions across unrelated screens; logic is difficult to test in isolation; state mutations and side effects are hard to trace.
Fix: Refactor incrementally into modules for authentication, storage, trades, accounts, analytics, reporting, imports, settings, and UI. Preserve behavior and public interfaces until each area has regression coverage.




9. Build, dependency, and maintenance gaps
package.json defines development, build, and preview scripts, but no test or lint script. It also declares React and Framer Motion while the reviewed core application is heavily DOM-driven and uses global JavaScript. 

GitHub
+1



Why it matters: There is no standard automated gate to catch regressions, and the actual use of each dependency needs to be established before removal or architectural changes.
Fix: Audit direct and transitive dependencies, pin a reproducible dependency state, add linting and tests, and run production builds in CI. Do not remove dependencies based solely on their names.


These issues are found by chatgpt. Do you review and make a plan on how to approach to this project. No need to do everything in one go. Lets go step by step but properly and efficiently.
