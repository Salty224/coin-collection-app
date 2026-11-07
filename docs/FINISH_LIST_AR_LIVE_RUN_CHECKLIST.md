# (ar) Finish list from Lookup_Finishes: TEST / LIVE run checklist

Branch `claude/finish-list-ar`. Write-up: docs/ref/ADD_COIN.md "Finish list from Lookup_Finishes (ar)".

No deadline (Ray, 7 Nov 2026): Diamond Field is entered when the coins arrive.

Before TEST: refresh `_Testing` from LIVE so its Lookup_Finishes has Various (A13), Matte (A14) and Diamond Field (A15). Without the sheet TEST still shows the fallback list, but never saves a device copy.

1. Deploy `claude/finish-list-ar` to TEST. The TEST bar shows the branch.
2. Docket, About: the launch line says "12 of 12 sheets"; the per-sheet list names Lookup_Finishes.
3. Add Coin, Finish dropdown: "— not recorded —", then Lookup_Finishes column A in the sheet's order. Diamond Field and Matte are there. **"Various" is NOT offered.** No grey "Finish list from the app" note.
4. Pick Diamond Field, fill the rest, Save to Staging. Reopen the draft from Staging Review: Finish still shows Diamond Field.
5. Catalog fill with an unknown Finish keeps the pick: pick a Finish by hand first, then choose an identity whose catalog row has a Finish the list doesn't offer (if there is one; "Various" on a set-level row works). The Finish you picked stays. A catalog row whose Finish IS listed fills it, or offers "Use <Finish> (from the catalog)" when the Finish is blank.
6. Close and reopen the app (10+ min after the last workbook edit): Docket says "saved copy matched", and Add Coin's list is the same as in step 3.
7. (Optional) Offline (airplane mode) after step 6: the app opens from the saved copy, and Add Coin's list is the sheet's list. Saves are refused offline as before.

After merge and the LIVE deploy:
8. LIVE first launch: "Data: read from the workbook" (the old saved copy is refused, "format"), no TEST bar, Diamond Field in the Finish list, Various not offered.

Results: (none yet)
