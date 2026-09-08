# Authenticated UX prototype

## Purpose

This visual prototype establishes the P0 navigation and screen language before replay, analytics, matchup, and knowledge persistence are implemented. It preserves live team, version, roster, metadata, import, and note behavior. All other domain content is typed fixture data and must not be treated as stored user evidence.

Damage calculation functionality is deliberately excluded. A team-scoped Calculator tab reserves its correct place in the hierarchy, but contains no calculator controls, saved results, or matchup calculation content.

## Navigation

The authenticated shell contains Home, Teams, Knowledge, and Profile. Desktop uses a persistent sidebar; mobile uses a compact header and fixed primary navigation.

Teams are the working unit. A team workspace has Overview, Roster, Replays, Statistics, Matchups, Calculator, and Notes tabs. Replays, statistics, matchup plans, and calculations never appear as peer-level global sections because they require a team context. Team settings contains metadata, retained source, version history, and the existing revision workflow. A selected team version remains in the URL through the existing `version` search parameter.

## Fixture boundary

`src/lib/prototype-data.ts` owns replay, analytics, matchup, activity, and knowledge fixtures. Screens may combine these fixtures with the selected real team’s roster and identity, but no fixture is persisted, submitted, filtered, or used for a product decision. Replace fixtures feature-by-feature when their owning P0 service and data model are delivered.

## Interaction and accessibility

Links navigate between the prototype’s real routes. Controls for unfinished product operations are disabled and state their role in surrounding copy; they do not suggest successful persistence. Native tables remain available in scrollable labelled regions, rates show their numerator and denominator, status has text as well as color, and all screens have a descriptive heading. Small screens stack panels and retain horizontal containment for tables and tab bars.
