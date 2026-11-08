# Code map: app.html, function -> line (generated)

`app.html` is 38,996 lines. Generated from `296d8c4` (the (bk) code commit, `ea60360` on `claude/workbook-session-bk` before its rebase onto main; merged 8 Nov 2026; the merge's docs commit does not touch app.html) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

The function lists are hand-chosen (the functions the docs/ref/ files mention most, grouped by area) and kept by name; the script only refreshes the numbers and the region list. A renamed function is reported as MISSING: fix its name in this file.

Regenerate (from the repo root):

```
python3 - <<'PY'
import re
src = open('app.html', encoding='utf-8').read().split('\n')
decl = {}
for i, l in enumerate(src, 1):
    m = re.match(r'\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', l)
    if m and m.group(1) not in decl: decl[m.group(1)] = i
doc = open('docs/CODEMAP.md', encoding='utf-8').read()
def fix(m):
    n = m.group(1)
    if n not in decl: print('MISSING', n); return m.group(0)
    return '%s  L%d' % (n, decl[n])
doc = re.sub(r'(?m)^([A-Za-z_$][\w$]*)  L\d+$', fix, doc)
reg = []
for i, l in enumerate(src, 1):
    if re.match(r'\s*// ={20,}', l):
        j = i
        while j < len(src) and re.match(r'\s*// ={20,}', src[j]): j += 1
        m = re.match(r"\s*//\s+([A-Z][A-Z0-9 &/,'’\-—:()+.]{7,})", src[j]) if j < len(src) else None
        if m: reg.append('L%d  %s' % (i, m.group(1).strip().rstrip(' —-:(,.')))
doc = re.sub(r'(?s)(<!-- regions:start -->\n).*?(<!-- regions:end -->)', lambda m: m.group(1) + '\n'.join(reg) + '\n' + m.group(2), doc)
doc = re.sub(r'`app.html` is [\d,]+ lines', '`app.html` is {:,} lines'.format(len(src)), doc)
open('docs/CODEMAP.md', 'w', encoding='utf-8').write(doc)
PY
```

## Regions (the all-caps banner comments in app.html)

<!-- regions:start -->
L5454  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L5983  STORED PHOTOS / RECEIPTS
L5985  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6346  LIVE NAV DATA
L9293  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L10245  BROWSE EDIT WRITE LAYER
L11480  COINID RE-LINKING ON IDENTITY EDIT
L11918  SET ATTACH / DETACH — A
L12133  PHOTOS / RECEIPTS TABLE WRITE LAYER
L12626  PURGE
L12993  CONTAINERS READ-LAYER JOIN
L13070  WRITE-LAYER GUARD DIALOGS
L13471  ADD COIN
L13775  ADD COIN PHASE 2
L14341  DOCKET RESEARCH QUEUE
L14715  FAKE DATA
L14999  PHOTO GALLERY & CROP PIPELINE
L16511  SECTION LOADING INDICATOR
L16547  SHARING
L16580  DASHBOARD
L19979  RECORD ACCORDIONS
L20428  BROWSE DETAIL — EDIT
L22792  ALBUMS
L24255  WISHLIST
L24421  NEEDS ATTENTION
L25204  STAGING REVIEW — P
L26215  STATS & VALUE
L26339  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L27229  FORMER HOLDINGS
L27690  RECEIPT
L27923  COMMIT A CAPTURED RECEIPT
L28771  PHOTO CROP ADJUSTER
L28993  STAGE 1 — BACKGROUND CROP
L29277  CROP PIPELINE ORCHESTRATOR
L29356  COMMIT A CAPTURED PHOTO
L29539  STORED PHOTOS IN THE CAPTURE UI
L29626  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L30233  PHOTOS WAIT FOR SAVE (O
L30642  CROP FROM AN UPLOADED PHOTO
L31149  GALLERY CAPTURE WIDGET
L31269  SUB-GROUP PHOTO SHEET
L31296  DRAFT MODE (A
L31621  ADD SET
L31772  ADD SET STEP 2
L31841  MANAGE PHOTOS
L32504  GALLERY DISPLAY
L32603  IN-APP MEDIA VIEWER
L33555  FILES PICKER + PHOTO GUARD (A
L33590  UNIFIED IMAGE CHOOSER (O
L33657  PHOTO SLOTS
L33784  ADD COIN
L33816  GRADE PICKER
L33885  DESCRIPTION AUTO-FILL
L34405  DESCRIPTION CONSISTENCY GATE (A
L34595  PCGS LABEL AUTO-POPULATE
L35207  DIRECT-WRITE
L35553  ADD COIN SAVE — P
L36081  EDITING AN EXISTING STAGING DRAFT (P
L36322  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L37173  YEAR PICKER
L37625  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8401
activeCoins  L8776
isExitStatus  L10367
ownedCoins  L10380
buildCoinDraft  L13537
coinDraftToAllValues  L13859
compositionLabelCandidates  L17976
setFittedCornerText  L17996
roundToCents  L21543
valueWithFaceFloor  L21585
refreshVarietyOptions  L34372
applyDbCoinsRowToForm  L34696
readAddCoinFormForDraft  L35432
refreshAddCoinCategoryUI  L16060
addCoinDirectSaveGaps  L35242
addCoinMatchResolved  L35275
addCoinGateMessage  L35264
saveCoinDraftEdit  L35766
resetAddCoinForm  L35947
applyCoinDraftToForm  L36145

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L10974
saveCoinRowToWorkbook  L11360
writeCoinIdCell  L11550
setDraftFolder  L13321
coinDraftFolder  L13506
setFlipPhotoUrl  L15302
readBrowseEditForm  L21804
checkDesignationReresolution  L22684
collectionIdNumber  L25221
renderStagingList  L25260
promoteStagedCoin  L25580
rejectStagedCoin  L26164
findDbCoinsMatch  L34040
isVarietyRecognized  L34399
renderAmbiguousMatchList  L34823
isConfidentMatch  L35248
coinDraftPromoteGaps  L14069
allRowHoldsCoinDraft  L14092
coinOnLoadedAllSheet  L13698
coinDraftStaleOnAll  L13710
markCoinDraftAlreadyPromoted  L25716
finishCoinDraftWrite  L25660

## Add Set

getWriteToken  L9333
reservationIdNumber  L13253
addChildToSetDraft  L13431
plannedPromotionMoves  L14633
matchDbSetsByProductCode  L37716
dbSetTypeName  L37734
composeSetName  L37750
categoryFromLineage  L37790
readAddSetYear  L38257
resumeSetDraftAtStep1  L38380
startSetCapture  L38514
allSubGroupsFull  L38626
renderChildStep  L38632
readChildFormValues  L38740
restoreChildFormValues  L38755
saveCurrentChild  L38803

## Albums

mapWorkbookRowToDbSet  L8191
buildLiveAlbums  L8330
activeDbCoins  L8778
activeAlbums  L8894
setBrowseStepContext  L18458
resolveCoinAlbumLink  L19817
renderAlbumsList  L23015
initAlbums  L23070
computeAlbumPageRows  L23179
openAlbumAtPage  L23338
showAlbumDetail  L23423
slotMintage  L23454
formatAlbumMintage  L23475
renderSlotCell  L23679
turnAlbumPage  L23985
renderAlbumBook  L24082

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10729
ensureAllHeaderMap  L10747
ensureSheetHeaderMap  L12209
missingWriteColumns  L10765
assertNoFormulaCells  L10797
readAllRowForWrite  L10882
batchWriteError  L10686
partialSaveResult  L11051

refreshLiveCoinsAfterWrite  L9287
__setBrowseEditWriteEnabledForTest  L10477
excelSerialToday  L10528
workbookDateToday  L10567
localISODateToday  L10610
toWorkbookDate  L10617
__resetAllHeaderMapForTest  L10808
findAllSheetRowNumber  L10812
detectIdentityOverwrites  L10954
createAllSheetRow  L11802
writeOriginSetIdCell  L11996
writeRecordRow  L12299
resolveStorageLocation  L13050
showWriteGuard  L13077
promoteCoinDraftToAllSheetUnlocked  L14138
forceAddCoinDraft  L25830

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5842
getReferenceImageToken  L5896
fetchReferenceImageBlob  L5928
ensureReferenceImageFetch  L5959
__setSplashTimingsForTest  L6473
noteRetryAfter  L6503
abortStartupRequests  L6550
withRequestTimeout  L6557
refetchMissingLiveNavSheets  L8725
liveDataMode  L8867
saveDocketQueue  L14506
hasReferenceImage  L16798
applyRealReferenceImage  L16941

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L8980
graph  L10203
loadDocketQueue  L14442
galleryFlipEntry  L15285
buildCertLookupUrl  L15554
spotlightCoinList  L16679
applyDiscContent  L16855
originSetIdKeysMatch  L19504
setChildrenFor  L19509
compositionTextFor  L19787
resolveChildParentSet  L19897
renderDetailAccordions  L20052
buildSetChildRow  L20721
catalogFunFactFor  L21303
formatCurrency  L21564
renderStats  L26977

## Catalog, Sets tab, Rolls, live-nav data

colVal  L7967
buildLookupCategoryList  L8677
activeDbSets  L8777
coinMatchesSearchQuery  L17711
metalCategoryFor  L17883
coinsTabBaseRows  L18701
medalTabBaseRows  L18714
applyCoinsTabFilters  L18738
applySetsTabFilters  L18765
renderSetChecklist  L18789
rollYearNumber  L18846
applyRollsTabFilters  L18893
resetBrowseFilters  L18950
showBrowseTab  L18998
detailTitleText  L19631
ownedSetForSetId  L37868
applyAddSetContext  L38468

## CoinID matcher

activeLookupGraders  L8779
knownDbCoinsFinishValues  L22374
dbCoinsCandidatesFor  L22389
docketRecheckEntry  L24575
runWithButtonPending  L25616
promoteCoinDraft  L25783
recheckCoinDraftMatch  L25983
lookupDescriptionCandidates  L33947
normField  L34018
addCoinIdentityShape  L34057
currentAddCoinMatchState  L34116
checkDbCoinsMatch  L34142
resolveAddCoinCatalogMatch  L34254
parsePcgsLabel  L34625
updateSaveConfidenceUI  L35296
completeAddCoinSave  L35588

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9025
coinDetailsFor  L14931
setNavBack  L16251
navigate  L16313
initCabinet  L16607
updateDocketFob  L16640
resetSpotlightTimer  L17625
browseMetalTest  L18317
sortRollRows  L18859
rollsMetalTest  L18885
armLeaveGuard  L29995
mintMarkOtherSelected  L34976
selectMintMarkOther  L34980
buildSplashDiagnosticText  L37338
runSplashConnect  L37375
docketQueueReady  L37452

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L10213
__resetWorkbookWebUrlCacheForTest  L10222
getCachedFolderWebUrl  L10232
flagCoinIdNeedsRelink  L12973
listSetDrafts  L13414
dismissSetDraftGap  L13463
buildDocketEntry  L14533
docketOpenEntries  L14566
appendDocketEntry  L14576
coinMissingPhoto  L17750
wireStaticAccordionToggle  L21452
performBrowseEditWrite  L22042
renderNeedsAttentionHub  L24725
appendDocketRows  L25103
buildCoinRecordFromForm  L35408

## Flip card and corner labels

mapWorkbookRowToCoin  L8001
wireSideToggle  L16917
renderCornerLines  L16960
wrapTextToTwoLines  L16983
renderFittedCornerLines  L17045
renderTypeDenomCorner  L17257
gradeDesignationCornerText  L17406
applyFlipCorners  L17419
cornerClearsDisc  L18100
shrinkCornerToFit  L18160
setCompositionCornerText  L18263
renderBrowseGrid  L18460
toggleBrowseDetailSide  L19446
showBrowseDetail  L19639
isSetRow  L19833
escapeHtmlText  L27730

## Former Holdings and Purge

formerHoldings  L10416
writePurgedCell  L12029
patchRecordRow  L12337
readRecordRows  L12383
buildPhotoRowPatch  L12579
clearPhotoRowField  L12597
purgeablePhotosFor  L12660
fileRowsForPhotos  L12701
finalisePurgedFlag  L12759
purgeCoinPhotos  L12801
activeYearFilterState  L18645
yearRowTestAgainst  L18653
updateActiveYearFilterButtonUI  L18678
applyAfterYearFilterChange  L18682
browseStepListFallback  L19537
renderFormerHoldings  L27347

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10438
setSelectValuePreservingUnknown  L20901
coinValueFigure  L21608
ensureSpotPricesForMeltLabels  L21663
loadSpotPrices  L26241
renderSpotPrices  L26298
refreshLedgerValueTiles  L27094

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L12887
recordPromotedCoinRecords  L14007
seriesLabel  L16746
sanitizeSeriesName  L16777
referenceSeriesKey  L16781
showBrowseEditSetView  L21325
commitReceiptCapture  L28093
photoCommitTargetId  L29384
unsavedEditsForView  L29789
refreshEditSaveState  L29933
buildPhotoPairSlot  L31409
manageOpenEndedBlock  L31969
renderManagePhotos  L32148
renderManagePhotosInto  L32165
uploadCoinDraftPhotos  L35508
uploadDraftPhoto  L38507

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9184
checkSessionAgainstWorkbook  L7324
checkWorkbookVersion  L6813
deleteWorkbookCacheForWrite  L7694
fetchWorkbookSheetRows  L6583
fetchWorkbookVersion  L6767
finishCoinRowSave  L11338
fullReadVersionTrusted  L7396
gatedGraphClient  L7218
hashSheetValues  L7404
idbOpenCache  L7621
isMsalNetworkError  L7532
launchFromSavedCopy  L7784
loadWorkbookCacheRecord  L7748
noteFullReadReport  L6713
noteRecentRowWrite  L11099
noteSaveOutcome  L11190
onFullReadLanded  L7416
recordWorkbookVersionCheck  L6797
refreshSessionFromWorkbook  L7371
renderDocketDataLine  L7856
renderLagProbe  L7939
renderLoadReport  L6870
renderSessionState  L7487
rowsFromSheetValues  L6646
saveWorkbookCacheAfterRead  L7701
setConnectionTrouble  L7297
settleSavedCopyVersion  L7812
startLagProbe  L7907
tokenFailureAction  L7542
whenWritesAllowed  L7455
withRecentWrites  L11110
withSaveTiming  L7055
workbookSessionChecked  L7130
workbookWritesAllowed  L7134

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L8792
addCoinCatalogFinish  L35256
applyCoinDraftToForm  L36145
applyDbCoinsRowToForm  L34696
applyLiveNavOptionalRows  L8605
buildLookupFinishList  L8655
catalogFinishGroupKey  L18357
populateFinishOptions  L8799
refetchMissingLiveNavSheets  L8725
resetAddCoinForm  L35947
setSelectValuePreservingUnknown  L20901

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L11224
allRowForWriteFromDetail  L10895
claimedRows  L11729
createAllSheetRow  L11802
idbCacheDelete  L7664
keysNotVisibleError  L11747
keysNotVisibleRows  L11742
markCoinDraftAlreadyPromoted  L25716
markCoinDraftAlreadyPromotedUntimed  L25725
noteClaimedRow  L11733
noteOwnRowState  L11160
ownCellsMatch  L11142
ownStateIndex  L11175
readAllRowForSave  L11241
readAllRowForWrite  L10882
readBackLastModified  L11293
rowClaimedThisSession  L11734
rowGuessProblem  L11228
saveCoinRowToWorkbook  L11360
savedCopyDeleteStepName  L7274
serialToClockWithSeconds  L11284
startSaveWatch  L6990
stopSaveWatch  L7019
withLatestOwnState  L11180
writeRecordRow  L12299

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L9440
dropExcelSession  L9411
excelSessionIdForRequest  L9422
excelSessionRejection  L9527
excelSessionsApply  L9410
excelWorkbookFetch  L9547
noteExcelSessionEvent  L9397
postCreateSession  L9430
prepareExcelSessionForStep  L9495
promoteCoinDraftToAllSheetInStep  L14146
runWorkbookStep  L7186
sessionChangedError  L9537
startExcelSessionAfterLaunch  L9517
writeRecordRowInStep  L12302
