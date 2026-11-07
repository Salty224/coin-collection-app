# Code map: app.html, function -> line (generated)

`app.html` is 38,532 lines. Generated from `db8673e` (the last code commit of `claude/save-speed-ax`, (ax) Stage 1 + 2a, fast-forwarded to main 7 Nov 2026; the merge's docs commit does not touch app.html) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L9216  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L9905  BROWSE EDIT WRITE LAYER
L11106  COINID RE-LINKING ON IDENTITY EDIT
L11542  SET ATTACH / DETACH — A
L11753  PHOTOS / RECEIPTS TABLE WRITE LAYER
L12218  PURGE
L12577  CONTAINERS READ-LAYER JOIN
L12654  WRITE-LAYER GUARD DIALOGS
L13055  ADD COIN
L13359  ADD COIN PHASE 2
L13912  DOCKET RESEARCH QUEUE
L14286  FAKE DATA
L14570  PHOTO GALLERY & CROP PIPELINE
L16082  SECTION LOADING INDICATOR
L16118  SHARING
L16151  DASHBOARD
L19550  RECORD ACCORDIONS
L19999  BROWSE DETAIL — EDIT
L22356  ALBUMS
L23819  WISHLIST
L23985  NEEDS ATTENTION
L24764  STAGING REVIEW — P
L25767  STATS & VALUE
L25891  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L26777  FORMER HOLDINGS
L27238  RECEIPT
L27471  COMMIT A CAPTURED RECEIPT
L28307  PHOTO CROP ADJUSTER
L28529  STAGE 1 — BACKGROUND CROP
L28813  CROP PIPELINE ORCHESTRATOR
L28892  COMMIT A CAPTURED PHOTO
L29075  STORED PHOTOS IN THE CAPTURE UI
L29162  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L29769  PHOTOS WAIT FOR SAVE (O
L30178  CROP FROM AN UPLOADED PHOTO
L30685  GALLERY CAPTURE WIDGET
L30805  SUB-GROUP PHOTO SHEET
L30832  DRAFT MODE (A
L31157  ADD SET
L31308  ADD SET STEP 2
L31377  MANAGE PHOTOS
L32040  GALLERY DISPLAY
L32139  IN-APP MEDIA VIEWER
L33091  FILES PICKER + PHOTO GUARD (A
L33126  UNIFIED IMAGE CHOOSER (O
L33193  PHOTO SLOTS
L33320  ADD COIN
L33352  GRADE PICKER
L33421  DESCRIPTION AUTO-FILL
L33941  DESCRIPTION CONSISTENCY GATE (A
L34131  PCGS LABEL AUTO-POPULATE
L34743  DIRECT-WRITE
L35089  ADD COIN SAVE — P
L35617  EDITING AN EXISTING STAGING DRAFT (P
L35858  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L36709  YEAR PICKER
L37161  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8324
activeCoins  L8699
isExitStatus  L10027
ownedCoins  L10040
buildCoinDraft  L13121
coinDraftToAllValues  L13443
compositionLabelCandidates  L17547
setFittedCornerText  L17567
roundToCents  L21111
valueWithFaceFloor  L21153
refreshVarietyOptions  L33908
applyDbCoinsRowToForm  L34232
readAddCoinFormForDraft  L34968
refreshAddCoinCategoryUI  L15631
addCoinDirectSaveGaps  L34778
addCoinMatchResolved  L34811
addCoinGateMessage  L34800
saveCoinDraftEdit  L35302
resetAddCoinForm  L35483
applyCoinDraftToForm  L35681

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L10634
saveCoinRowToWorkbook  L11009
writeCoinIdCell  L11176
setDraftFolder  L12905
coinDraftFolder  L13090
setFlipPhotoUrl  L14873
readBrowseEditForm  L21372
checkDesignationReresolution  L22248
collectionIdNumber  L24781
renderStagingList  L24820
promoteStagedCoin  L25140
rejectStagedCoin  L25716
findDbCoinsMatch  L33576
isVarietyRecognized  L33935
renderAmbiguousMatchList  L34359
isConfidentMatch  L34784
coinDraftPromoteGaps  L13653
allRowHoldsCoinDraft  L13676
coinOnLoadedAllSheet  L13282
coinDraftStaleOnAll  L13294
markCoinDraftAlreadyPromoted  L25276
finishCoinDraftWrite  L25220

## Add Set

getWriteToken  L9256
reservationIdNumber  L12837
addChildToSetDraft  L13015
plannedPromotionMoves  L14204
matchDbSetsByProductCode  L37252
dbSetTypeName  L37270
composeSetName  L37286
categoryFromLineage  L37326
readAddSetYear  L37793
resumeSetDraftAtStep1  L37916
startSetCapture  L38050
allSubGroupsFull  L38162
renderChildStep  L38168
readChildFormValues  L38276
restoreChildFormValues  L38291
saveCurrentChild  L38339

## Albums

mapWorkbookRowToDbSet  L8114
buildLiveAlbums  L8253
activeDbCoins  L8701
activeAlbums  L8817
setBrowseStepContext  L18029
resolveCoinAlbumLink  L19388
renderAlbumsList  L22579
initAlbums  L22634
computeAlbumPageRows  L22743
openAlbumAtPage  L22902
showAlbumDetail  L22987
slotMintage  L23018
formatAlbumMintage  L23039
renderSlotCell  L23243
turnAlbumPage  L23549
renderAlbumBook  L23646

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10389
ensureAllHeaderMap  L10407
ensureSheetHeaderMap  L11829
missingWriteColumns  L10425
assertNoFormulaCells  L10457
readAllRowForWrite  L10542
batchWriteError  L10346
partialSaveResult  L10711

refreshLiveCoinsAfterWrite  L9210
__setBrowseEditWriteEnabledForTest  L10137
excelSerialToday  L10188
workbookDateToday  L10227
localISODateToday  L10270
toWorkbookDate  L10277
__resetAllHeaderMapForTest  L10468
findAllSheetRowNumber  L10472
detectIdentityOverwrites  L10614
createAllSheetRow  L11428
writeOriginSetIdCell  L11620
writeRecordRow  L11918
resolveStorageLocation  L12634
showWriteGuard  L12661
promoteCoinDraftToAllSheetUnlocked  L13718
forceAddCoinDraft  L25386

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5842
getReferenceImageToken  L5896
fetchReferenceImageBlob  L5928
ensureReferenceImageFetch  L5959
__setSplashTimingsForTest  L6473
noteRetryAfter  L6503
abortStartupRequests  L6550
withRequestTimeout  L6557
refetchMissingLiveNavSheets  L8648
liveDataMode  L8790
saveDocketQueue  L14077
hasReferenceImage  L16369
applyRealReferenceImage  L16512

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L8903
graph  L9863
loadDocketQueue  L14013
galleryFlipEntry  L14856
buildCertLookupUrl  L15125
spotlightCoinList  L16250
applyDiscContent  L16426
originSetIdKeysMatch  L19075
setChildrenFor  L19080
compositionTextFor  L19358
resolveChildParentSet  L19468
renderDetailAccordions  L19623
buildSetChildRow  L20292
catalogFunFactFor  L20871
formatCurrency  L21132
renderStats  L26525

## Catalog, Sets tab, Rolls, live-nav data

colVal  L7890
buildLookupCategoryList  L8600
activeDbSets  L8700
coinMatchesSearchQuery  L17282
metalCategoryFor  L17454
coinsTabBaseRows  L18272
medalTabBaseRows  L18285
applyCoinsTabFilters  L18309
applySetsTabFilters  L18336
renderSetChecklist  L18360
rollYearNumber  L18417
applyRollsTabFilters  L18464
resetBrowseFilters  L18521
showBrowseTab  L18569
detailTitleText  L19202
ownedSetForSetId  L37404
applyAddSetContext  L38004

## CoinID matcher

activeLookupGraders  L8702
knownDbCoinsFinishValues  L21938
dbCoinsCandidatesFor  L21953
docketRecheckEntry  L24135
runWithButtonPending  L25176
promoteCoinDraft  L25339
recheckCoinDraftMatch  L25539
lookupDescriptionCandidates  L33483
normField  L33554
addCoinIdentityShape  L33593
currentAddCoinMatchState  L33652
checkDbCoinsMatch  L33678
resolveAddCoinCatalogMatch  L33790
parsePcgsLabel  L34161
updateSaveConfidenceUI  L34832
completeAddCoinSave  L35124

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L8948
coinDetailsFor  L14502
setNavBack  L15822
navigate  L15884
initCabinet  L16178
updateDocketFob  L16211
resetSpotlightTimer  L17196
browseMetalTest  L17888
sortRollRows  L18430
rollsMetalTest  L18456
armLeaveGuard  L29531
mintMarkOtherSelected  L34512
selectMintMarkOther  L34516
buildSplashDiagnosticText  L36874
runSplashConnect  L36911
docketQueueReady  L36988

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L9873
__resetWorkbookWebUrlCacheForTest  L9882
getCachedFolderWebUrl  L9892
flagCoinIdNeedsRelink  L12557
listSetDrafts  L12998
dismissSetDraftGap  L13047
buildDocketEntry  L14104
docketOpenEntries  L14137
appendDocketEntry  L14147
coinMissingPhoto  L17321
wireStaticAccordionToggle  L21020
performBrowseEditWrite  L21610
renderNeedsAttentionHub  L24285
appendDocketRows  L24663
buildCoinRecordFromForm  L34944

## Flip card and corner labels

mapWorkbookRowToCoin  L7924
wireSideToggle  L16488
renderCornerLines  L16531
wrapTextToTwoLines  L16554
renderFittedCornerLines  L16616
renderTypeDenomCorner  L16828
gradeDesignationCornerText  L16977
applyFlipCorners  L16990
cornerClearsDisc  L17671
shrinkCornerToFit  L17731
setCompositionCornerText  L17834
renderBrowseGrid  L18031
toggleBrowseDetailSide  L19017
showBrowseDetail  L19210
isSetRow  L19404
escapeHtmlText  L27278

## Former Holdings and Purge

formerHoldings  L10076
writePurgedCell  L11653
patchRecordRow  L11953
readRecordRows  L11999
buildPhotoRowPatch  L12179
clearPhotoRowField  L12196
purgeablePhotosFor  L12252
fileRowsForPhotos  L12293
finalisePurgedFlag  L12350
purgeCoinPhotos  L12389
activeYearFilterState  L18216
yearRowTestAgainst  L18224
updateActiveYearFilterButtonUI  L18249
applyAfterYearFilterChange  L18253
browseStepListFallback  L19108
renderFormerHoldings  L26895

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10098
setSelectValuePreservingUnknown  L20472
coinValueFigure  L21176
ensureSpotPricesForMeltLabels  L21231
loadSpotPrices  L25793
renderSpotPrices  L25850
refreshLedgerValueTiles  L26642

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L12474
recordPromotedCoinRecords  L13591
seriesLabel  L16317
sanitizeSeriesName  L16348
referenceSeriesKey  L16352
showBrowseEditSetView  L20893
commitReceiptCapture  L27636
photoCommitTargetId  L28920
unsavedEditsForView  L29325
refreshEditSaveState  L29469
buildPhotoPairSlot  L30945
manageOpenEndedBlock  L31505
renderManagePhotos  L31684
renderManagePhotosInto  L31701
uploadCoinDraftPhotos  L35044
uploadDraftPhoto  L38043

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9107
checkSessionAgainstWorkbook  L7247
checkWorkbookVersion  L6811
deleteWorkbookCacheForWrite  L7617
fetchWorkbookSheetRows  L6583
fetchWorkbookVersion  L6765
finishCoinRowSave  L10994
fullReadVersionTrusted  L7319
gatedGraphClient  L7157
hashSheetValues  L7327
idbOpenCache  L7544
isMsalNetworkError  L7455
launchFromSavedCopy  L7707
loadWorkbookCacheRecord  L7671
noteFullReadReport  L6711
noteRecentRowWrite  L10759
noteSaveOutcome  L10846
onFullReadLanded  L7339
recordWorkbookVersionCheck  L6795
refreshSessionFromWorkbook  L7294
renderDocketDataLine  L7779
renderLagProbe  L7862
renderLoadReport  L6868
renderSessionState  L7410
rowsFromSheetValues  L6644
saveWorkbookCacheAfterRead  L7624
setConnectionTrouble  L7220
settleSavedCopyVersion  L7735
startLagProbe  L7830
tokenFailureAction  L7465
whenWritesAllowed  L7378
withRecentWrites  L10770
withSaveTiming  L7040
workbookSessionChecked  L7115
workbookWritesAllowed  L7119

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L8715
addCoinCatalogFinish  L34792
applyCoinDraftToForm  L35681
applyDbCoinsRowToForm  L34232
applyLiveNavOptionalRows  L8528
buildLookupFinishList  L8578
catalogFinishGroupKey  L17928
populateFinishOptions  L8722
refetchMissingLiveNavSheets  L8648
resetAddCoinForm  L35483
setSelectValuePreservingUnknown  L20472

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L10880
allRowForWriteFromDetail  L10555
claimedRows  L11355
createAllSheetRow  L11428
idbCacheDelete  L7587
keysNotVisibleError  L11373
keysNotVisibleRows  L11368
markCoinDraftAlreadyPromoted  L25276
markCoinDraftAlreadyPromotedUntimed  L25284
noteClaimedRow  L11359
noteOwnRowState  L10820
ownCellsMatch  L10802
ownStateIndex  L10831
readAllRowForSave  L10897
readAllRowForWrite  L10542
readBackLastModified  L10949
rowClaimedThisSession  L11360
rowGuessProblem  L10884
saveCoinRowToWorkbook  L11009
savedCopyDeleteStepName  L7197
serialToClockWithSeconds  L10940
startSaveWatch  L6975
stopSaveWatch  L7004
withLatestOwnState  L10836
writeRecordRow  L11918
