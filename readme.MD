# Spin the Wheel — County Kibao

## Reference redesign

The player wheel has been rebuilt around the supplied **SPIN THE WHEEL COUNTY KIBAO** artwork.
The active visual reference is the second page of the supplied PDF, which contains:

- Black outer ring
- Yellow, maroon, red and white alternating segments
- Bucket Hat, T-Shirt, Wristband and Tumbler artwork
- County Kulture decorative artwork
- `JOIN THE KULTURE; Tuko na Flava Kibao.` centre artwork
- Reference typography and artwork positioning

The wheel is now the primary interaction: **tap/click the wheel to spin**.

## Prize behaviour

The visual wheel has eight fixed design slots. The admin/prize engine still controls weighted chances and enabled prizes. Each default prize carries a `designSlot` value so the selected result lands on the corresponding artwork slot.

The redesigned prize configuration uses a new local-storage key:

`spin2win_prizes_kibao_reference_v4`

This prevents an older saved wheel configuration from silently overriding the new reference setup.

## Reference assets

`assets/images/wheel-reference.png` is the supplied PDF artwork rendered as the exact wheel reference used by the player screen.

Additional extracted transparent artwork is stored under:

`assets/images/reference/`


## Result / probability fixes
- The result shown after a spin is now read from the actual segment under the pointer after the wheel stops.
- The reference artwork sector mapping has been corrected: Bucket Hat, T-Shirt, Wristband and Tumbler now correspond to their physical wheel positions.
- Default prize chances are 0.5% per physical prize sector (2% total winning probability); retry sectors share the remaining 98%.
- Spin duration has been reduced to approximately 2.2 seconds with 4 full extra rotations.
- Prize storage key was bumped to v4 so the corrected defaults load instead of stale v2 settings.


### v4 Win Probability Test
- Bucket Hat: 2.5%
- T-Shirt: 2.5%
- Wristband: 2.5%
- Tumbler: 2.5%
- Total winning probability: 10%
- Try Again segments: 90% combined (22.5% each)
- The storage key was bumped to v4 so browsers do not retain the previous 2% configuration.
