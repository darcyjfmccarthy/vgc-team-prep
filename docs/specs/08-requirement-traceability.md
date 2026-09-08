# Requirement traceability

This map proves specification ownership. Final acceptance cases should be linked to executable test IDs as features are implemented.

## Functional requirements

| Requirement          | Priority | Owning specification / planned slice                                                                                    |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| FR-1.1–1.5           | P0       | Product: onboarding/actors; Architecture: identity/trust; Interfaces: account; Delivery phases 0–1                      |
| FR-1.6–1.7           | P1       | Architecture: external identities and account lifecycle; Interfaces: P1 account actions; Delivery P1 increment 1        |
| FR-2.1–2.7           | P0       | Product: import/version workflow; Domain: teams/invariants; Interfaces: teams; Delivery phase 1                         |
| FR-2.10–2.12         | P1       | Domain: collections/team drafts; Delivery P1 increment 1                                                                |
| FR-3.1–3.8           | P0       | Product: replay journey; Domain: replay ingestion/battles; Processing: pipeline/BO3; Delivery phase 2                   |
| FR-3.9–3.11          | P1       | Architecture: provider-client boundary; Delivery P1 increment 2                                                         |
| FR-4.1–4.5           | P0       | Domain: parser runs/events; Processing: retrieval/parsing/reprocessing; Delivery phase 2                                |
| FR-4.6–4.8           | P1       | Domain: extended events; Processing: data quality; Delivery P1 increment 2                                              |
| FR-5.1, 5.3–5.4, 5.6 | P0       | Product: game/set rule; Domain: games/battle sets; Processing: BO3/metrics; Delivery phase 2                            |
| FR-5.5               | P2       | Product P2 scope; Delivery P2 increments                                                                                |
| FR-6.1–6.7           | P0       | Product: review journey; Interfaces: analytics; Processing: metric definitions/filters; Delivery phase 3                |
| FR-6.8–6.12          | P1       | Processing: reproducibility/drill-down; Delivery P1 increment 3                                                         |
| FR-6.13              | P2       | Product P2 scope; Delivery P2 increments                                                                                |
| FR-7.1–7.6           | P0       | Product: matchup journey; Domain: matchups/dependencies; Interfaces: matchups; Delivery phase 4/5                       |
| FR-7.7–7.9, 7.11     | P1       | Domain: archetypes/review; Delivery P1 increment 4                                                                      |
| FR-8.1–8.6, 8.8–8.11 | P0       | Product: calculator journey; Domain: calculations; Interfaces: calculator; Processing: lifecycle; Delivery phase 5      |
| FR-8.12, 8.14–8.17   | P1       | Processing: semantic engine/dependencies; Delivery P1 increment 4                                                       |
| FR-8.18              | P2       | Product P2 scope; Delivery P2 increments                                                                                |
| FR-9.1–9.12          | P2       | Architecture: provider modules; Domain: future provider records; Delivery P2 increments                                 |
| FR-11.1–11.2         | P0       | Product: reuse/basic formatting; Domain/Interfaces: notes; Delivery phases 1–4                                          |
| FR-11.3              | P1       | Product P1 scope; Delivery P1 increment 5                                                                               |
| FR-11.6              | P0       | Product: knowledge; Domain/Interfaces: opposing sets/archetypes; Delivery phase 4                                       |
| FR-12.1              | P1       | Interfaces: account export; Delivery P1 increment 1                                                                     |
| FR-13.1–13.8         | P2       | Architecture: future AI provider module/trust boundary; Quality: privacy; Delivery P2 increments                        |
| FR-14.2              | P0       | Quality: observability; Delivery phases 0/2/6                                                                           |
| FR-14.3–14.5         | P1       | Architecture/Domain/Interfaces: operations; Quality: resilience; Delivery P1 increment 5                                |
| FR-15.1–15.8         | P2       | Architecture: future advertising provider module; Product/Quality: privacy and non-interruption; Delivery P2 increments |

Requirement numbering gaps (for example FR-2.8/2.9 and the absent FR-10) originate in `REQUIREMENTS.md`; this specification does not invent replacement requirements.

## Non-functional requirements

| Requirement                       | Specification coverage                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| NFR-1 Accuracy/data integrity     | Product rules; Domain invariants/provenance; Processing definitions; Quality tests                               |
| NFR-2 Performance                 | Architecture sync/async split; Processing indexed queries and measured summaries; Quality SLOs/performance tests |
| NFR-3 Availability/resilience     | Architecture AWS topology; Quality resilience/restore                                                            |
| NFR-4 Security                    | Architecture trust boundaries; Interfaces authz; Quality security controls                                       |
| NFR-5 Privacy                     | Product private default; Domain retention; Quality privacy inventory                                             |
| NFR-6 Extensibility               | Architecture feature/provider modules; file-structure organization rules                                         |
| NFR-7 Maintainability/testability | Architecture enforcement; Quality test/CI strategy; Delivery definition of done                                  |
| NFR-8 Observability               | Architecture telemetry; Interfaces correlation; Quality observability                                            |
| NFR-9 Backup/disaster recovery    | Domain retention; Quality backup/restore                                                                         |
| NFR-10 Usability                  | Product journeys/navigation; Delivery vertical slices                                                            |
| NFR-11 Accessibility              | Product responsive behavior; Quality accessibility definition/test suite                                         |
| NFR-12 Compatibility              | Architecture preserved raw sources; Quality browser matrix                                                       |
| NFR-13 Scalability/cost           | Architecture modular monolith/AWS; Quality cost controls                                                         |
| NFR-14 Legal/third-party          | Architecture provider-client boundary; Quality privacy/legal gates; Delivery launch review                       |

Local implementation and verification of these requirements are specified in [`09-local-development.md`](09-local-development.md), especially NFR-1–8 and NFR-12–13.

## Open issues derived from ambiguities

| ID    | Issue                                                                           | Default in this specification                                                                                                    | Resolution owner / latest point                       |
| ----- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| OI-01 | Exact launch ruleset and canonical mechanics/data are unnamed.                  | Versioned catalog/ruleset boundary.                                                                                              | Product + mechanics expert, before phase 1 acceptance |
| OI-02 | Reference calculator engine and certification.                                  | `@smogon/calc@0.11.0` is selected behind the server adapter; full Champions certification still requires authoritative fixtures. | Engineering/product/legal, before phase 5             |
| OI-03 | BO3 identifiers/metadata are not enumerated.                                    | Only deterministic provider encoding auto-groups; similarity suggests.                                                           | Parser owner with fixtures, before phase 2            |
| OI-04 | Meaning of “explicitly update a team version” conflicts with immutable history. | Only unsealed/unreferenced drafts mutate; otherwise successor version.                                                           | Product approval, before phase 1                      |
| OI-05 | Opponent Pokémon “wins/losses” perspective is ambiguous.                        | Store/return explicit user and opponent counts; label UI.                                                                        | Product/analytics, before phase 3                     |
| OI-06 | Bring rate is unknowable in partially revealed opponent teams.                  | Complete observations form denominator; partial evidence reported separately.                                                    | Product/analytics, before phase 3                     |
| OI-07 | “Poképaste-compatible representation” may mean text or provider-hosted paste.   | Export compatible text; hosted creation is not assumed.                                                                          | Product/legal, before P1 export                       |
| OI-08 | Account deletion/backup retention periods are absent.                           | Immediate access disable plus policy-driven delayed purge/backup expiry.                                                         | Privacy/operations, before production                 |
| OI-09 | Availability measurement boundary/profile is not defined.                       | Authenticated core service, excluding external-provider failures.                                                                | Operations/product, before phase 6                    |
| OI-10 | Incomplete team persistence boundary is unclear under FR-2.12.                  | Import previews may retain incomplete drafts/errors in the active form; persistent exploratory incomplete slots are P1.          | Product, before phase 1                               |

## Acceptance evidence convention

Future work should assign stable test/evidence IDs such as `AC-FR-3.5-01` and link them from issue, test, and release checklist. A requirement is “done” only when its mapped acceptance evidence passes in the intended environment; presence of code or a route alone is insufficient.
