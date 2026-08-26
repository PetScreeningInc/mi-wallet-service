# Pet ID / Wallet use-case map

**Status:** accepted (product landscape; not the HTTP contract)  
**Date:** 2026-08-26  
**Source:** PM working doc (Andrey / Guest), copied into this repo so the service stays aligned with the initiative.  
**Tickets:** [CON-1309](https://petscreening.atlassian.net/browse/CON-1309) (POC service), [CON-1297](https://petscreening.atlassian.net/browse/CON-1297) (Pet ID Wallet in Passport)

This file is **product intent**. Callers (Platform, later LTR/FTA, later partners) map claims into template `data`. This service does not own Passport profile, visas, or review ops.

## What this means for the wallet service

| Product idea | Service implication |
| --- | --- |
| Not one static card; a **credential system** | Versioned **templates** (`GENERIC` for the POC; later `STR_STAY`, `LTR_LEASE`, …). New use case = new template, not a new API. |
| Passport profile is the owner-side source of truth | Callers POST a **snapshot**. Live profile refresh / pass update push is **not** Wave A ([PDR non-goals](PDR.md)). |
| Pet ID vs Visa/Pass | Pet ID is share-anytime; a visa is a business relationship. Both can be `data` on different templates. This repo has no visa tables. |
| Privacy: stay pass ≠ lost-pet scan | Template `wallet` / `public` flags. Same `publicId` entropy; different field sets. |
| Validity windows (stay dates, lease term, sitting window) | `expiresAt` on `WalletDocument` is reserved; not required for [CON-1309](https://petscreening.atlassian.net/browse/CON-1309). |
| Scan-time trust (screenshot is not proof) | `GET /p/{publicId}` is the scan surface. First-class HTML ([public-page spec](specs/public-page.md)). Live re-fetch from Platform is later. |
| Lost pet QR | Often **page only**, not a wallet pass. Same public ingress. |
| Partner-issued passes (#25) | Same `POST /v1/wallets`; partner-defined schema in a template. |
| PM wedge: STR stay + lost pet QR | After the POC: first production templates / caller mapping in Platform. Not CON-1309 scope. |

**POC vs this map:** CON-1309 proves **one ingest + one public page + one wallet provider** with the mock skill. It does not implement 27 passes, expiry UX, or partner scan tooling.

---

## 1. Vision

Pet ID is a universal electronic animal info hub that allows owners to have all animal information on their mobile device and businesses to validate/learn whatever they want to know about the animal, backed by PetScreening.

### Underlying model

This is not one static card. It is a credential system:

- The **Passport profile** is the persistent source of truth about the pet (owner side + AA validation).
- A **Pet ID** is a reflection of the Passport profile that can be freely and conveniently shared by the owner with businesses/organisations when they want to access info about the animal.
- A **Pet ID Wallet** is a reflection of the Pet ID, physically located in the owner's mobile, that serves as a convenient interface for sharing the Pet ID with businesses.
- A **Visa/Pass** is an instance of a specific relationship between the animal (Passport profile) and a specific business (the business account in the PetScreening ecosystem) established in advance. The visa can be accessed/seen/checked by the business personnel via Pet ID.

Pet ID is used when (a) no visas can be issued in advance (for example, the business does not partner with PetScreening or the timeframe is too short) or (b) when the validation has to happen on site.

## 2. Use case landscape

1. STR
2. LTR/HOA
3. Assistance animals validated: Housing accommodation credential, rideshare, air travel.
4. Rides and taxi
5. Care network: Boarding/daycare drop-off, vet intake, groomer, sitter/walker handoff.
6. Travel: Hotel pet check-in pass, international travel dossier.
7. Everyday access and perks: Pet-friendly venue pass, private dog park / daycamp membership, perks and offers, dog-friendly workplace registration.
8. Safety and emergencies: Lost pet, emergency vet access, evacuation/shelter, owner's emergency card.
9. Lifecycle and compliance: Municipal license pass, insurance proof, adoption / rehoming transfer, breeder/shelter handoff.
10. Platform: Partner-issued passes, SP-side scan tooling, the trust mark.

### Use cases detailed (IN PROGRESS)

Format: **Use case** | relying party | claims | validity window | note.

### A. Stays (home)

1. **STR stay pass** | host / host's PM | pet screened, vaccinated, matches the booking | stay dates | Native to the Passport flow; this is the validated experiment grown up.
2. **LTR lease pass** | property manager | pet on the lease, screening tier, vaccinations current | lease term, renews with lease | Distribution through the existing PM network; the pass is the resident-facing proof of what PMs already buy from us.
3. **Pet resume / tour pass** | prospective landlord or host | full profile as a persuasion asset | pre-approval period | Owners marketing their pet to win approvals and bookings.

### B. Assistance animals (the vision's sharpest edge)

4. **Housing accommodation credential** | property manager | reasonable accommodation request reviewed; Recommended Service Animal / assistance animal | lease term | Housing is where documentation is legally meaningful (HUD guidance permits requesting reliable documentation when the disability is not apparent). This is our existing review business made portable. Strongest legal footing of the assistance animal set.
5. **Rideshare indicator (the Uber vision)** | driver | Recommended Service Animal | while the account link is active | Legally, Uber cannot require documentation from riders, and drivers may only ask the two permitted questions. So the credential is **voluntary trust infrastructure**: the rider opts in, the driver sees a verified indicator before pickup, denials and disputes drop. That reduced-dispute, compliance-posture value is what Uber would buy. Co-branded pass, PetScreening-verified.
6. **Air travel pass** | airline | completed DOT Service Animal Air Transportation Form + vaccination data | per trip, like a boarding pass | The DOT form is the only documentation airlines may require. Our play: prepare, store, and package the DOT form; a partner airline accepts it digitally instead of a PDF emailed 48 hours ahead. For non-service pets: cabin pet fee + carrier compliance as a paid pass.

**Claim language caution:** "Recommended Service Animal" carries different weight per context: legally requestable in housing, voluntary in rideshare and public accommodations, DOT-form-only in air. Exact wording per surface needs legal review. Same open question as "Verified / Friendly pet" in the exploration plan.

### C. Care network

7. **Boarding / daycare drop-off pass** | facility | rabies, bordetella, flea/tick as required | while vaccinations are current | The facility already demands this proof; today it is chased over email and paper. Highest-frequency requirement-driven moment in the landscape.
8. **Vet intake** | new vet | full history, prior records | one-time scan | Kills the clipboard form.
9. **Groomer pass** | groomer | rabies proof | while current | Lighter version of #7.
10. **Sitter / walker handoff pass** | sitter | care instructions, meds, feeding, emergency contacts, vet release authorization | the sitting window | The cleanest expression of the time-boxed pass model: it exists exactly as long as the sitter needs it.

### D. Travel and hospitality beyond STR

11. **Hotel pet check-in pass** | front desk | vaccinated, pet fee tier, behavioral screening | reservation dates | Same shape as the STR stay pass, different counterparty.
12. **International travel dossier** | border control, airline | health certificate (CVI), microchip, rabies titer | certificate validity window | Doc-heavy, painful, high willingness to pay; heavy ops lift and data we do not hold today.

### E. Everyday access and perks

13. **Pet-friendly venue pass** | brewery, store, office | "friendly pet" screening tier | open-ended | The Verified / Friendly pet badge from the plan, generalized.
14. **Private dog park / daycamp membership** | operator | vaccination + behavioral screening + membership | membership period | Sniffspot-type operators and premium parks already gate on vaccine proof.
15. **Perks and offers** | retail partners | verified profile | ongoing | Turns the pass into an engagement surface, not just proof; keeps it installed.
16. **Dog-friendly workplace registration** | employer | vaccinations, behavioral screening | employment / policy year | Offices increasingly formalize pet policies; same rail as LTR.

### F. Safety and emergencies

17. **Lost pet** | whoever finds the pet | contact relay, ID | always on | Same QR on a collar tag; finder scans, reaches the owner through a privacy relay. Not a wallet pass itself, but the always-on reason the profile stays current, and emotionally the strongest consumer hook.
18. **Emergency vet access** | ER vet | meds, allergies, conditions, primary vet | always on | Matters precisely when the owner is unreachable.
19. **Evacuation / shelter pass** | emergency shelter | vaccination proof | event window | Shelters commonly require vaccine records to admit pets.
20. **Owner's emergency card** | first responders | "pets at home" alert | always on | Inverse direction: a card about the pet, for the owner's wallet.

### G. Lifecycle and compliance

21. **Municipal license pass** | city / county | license current | license year | Fragmented market, low urgency, natural add-on later.
22. **Insurance proof** | landlord, venue | liability / pet insurance active | policy term | Pairs naturally with the LTR lease pass.
23. **Adoption / rehoming transfer** | new owner | full history transfers with the pet | permanent | Continuity of identity across owners, Carfax-like. Makes the profile an asset that appreciates.
24. **Breeder / shelter handoff** | new owner | pet starts life with a passport | permanent | Acquisition channel at the source of pet ownership.

### H. Platform (where the Uber deal generalizes)

25. **Partner-issued passes** | any business needing pet verification | partner-defined claim set | partner-defined | The Uber deal is one instance of a general product: partners drive their users to us, we issue a co-branded, scoped credential, and run the review ops behind it. The B2B product is credential issuance + scan-time verification + review operations.
26. **SP-side scan tooling** | service providers | scan to verify, with consent to pull records | per scan | Every scan is also an SP acquisition touchpoint; scanning is the top of the SP funnel.
27. **The trust mark** | the pet economy | "Verified by PetScreening" | permanent | The long game: the identity and trust rail for pets. Every use case above compounds toward this.

### Why wallet passes specifically (not just a screen in the app)

Wallet passes enable things a screenshot or info page cannot:

- **Expiry and revocation**: a pass for a stay ends with the stay; a lapsed vaccination visibly invalidates the pass.
- **Live updates**: the pass reflects the profile's current state at scan time; the QR resolves to the live profile, so a screenshot proves nothing.
- **Relevance**: passes can surface on the lock screen by time and place (at the airport, near the boarding facility, on check-in day).
- **Partner fields**: co-branding and partner-specific data are native to the pass format.
- Tangible proof on the phone; easy to open (not a buried screenshot).

## 3. Evaluation criteria

- **Data fit**: do we already hold the claims the pass asserts?
- **Counterparty pull**: does someone on the other side demand the proof, or does only the owner want it? Requirement-driven use cases self-distribute.
- **Frequency**: how often is the pass presented? Habit potential.
- **Validity-window fit**: does time-boxing add real value? This is the model's differentiator; use cases that need expiry prove the architecture.
- **Partner leverage**: does it use networks we already have (PMs, hosts, SPs) or produce Uber-style deals?
- **Monetization**: who pays, and how soon?
- **Risk**: claim defensibility, privacy, reputational (ESA adjacency).
- **Effort**: build + ops + bizdev.

## 4. Shortlist scoring

H / M / L, directional not precise.

| Use case | Data fit | Pull | Freq | Time-box fit | Monetization | Risk | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| STR stay pass | H | M | M | H | M | L | L |
| LTR lease pass | H | H | L | H | H | L | M |
| Housing accommodation credential | H | H | L | H | H | M | M |
| Boarding / daycare pass | H | H | H | M | M | L | M |
| Sitter / walker handoff | M | M | M | H | L | L | M |
| Lost pet QR | H | n/a | L | L | L | L | L |
| Rideshare indicator (Uber) | M | L* | H | L | H | M | H |
| Air travel pass | M | M | L | H | M | M | H |
| International dossier | L | H | L | H | H | M | H |
| Venue / perks passes | M | L | H | L | L | L | M |

\* Voluntary by law; the pull is Uber's (fewer disputes), not the driver's right to demand it.

## 5. Recommended sequence (product, not this repo's Wave A)

**Wedge, now: STR stay pass + lost pet QR.** The stay pass is the validated experiment matured: native entry point, host as counterparty, stay-dates validity proves the visa model end to end, smallest build. Lost pet rides on the same QR for near-zero cost and is the retention layer.

**Second: LTR lease pass + housing accommodation credential.** PM network; assistance animal documentation with legal standing in housing.

**Third: care network** (boarding / daycare / groomer / sitter). Frequency engine and SP scan flywheel (#26).

**Long game: the partner credential platform.** Do not gate the **service** POC on partner bizdev.

One line: **prove the visa model in stays where we own the counterparty, build habit in care, then sell the rail to partners.**

## 6. Risks and open questions

- **Claim language**: what we can defensibly assert per context. Legal review before assistance animal passes ship.
- **Verification integrity**: trust lives in scan-time resolution; scanner UX is first-class.
- **Privacy**: QR target must differ per pass type.
- **Multi-pass UX**: several passes for one dog must read as one identity (Passport / FE).
- **ESA adjacency**: credential must signal rigor.
- **Apple / Google guidelines**: branding, claims, NFC — confirm as adapters land ([CON-1309](https://petscreening.atlassian.net/browse/CON-1309) spike).
- **Partner dependence**: Uber-scale deals are upside, not the plan.

## 7. Open product questions (not this service)

1. Monetization and pricing: who pays first (owner premium, SP subscription, partner API).
2. Partner shortlist at achievable scale (boarding chain or PMS) before Uber-scale conversations.
