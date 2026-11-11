# Code map: app.html, function -> line (generated)

`app.html` is 39,254 lines. Generated from `1332303` (the (ak) code commit on `claude/holder-fullres-ak`, merged to main by fast-forward 11 Nov 2026; the merge's docs commit does not touch app.html) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L6396  LIVE NAV DATA
L9346  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L10343  BROWSE EDIT WRITE LAYER
L11578  COINID RE-LINKING ON IDENTITY EDIT
L12016  SET ATTACH / DETACH — A
L12231  PHOTOS / RECEIPTS TABLE WRITE LAYER
L12724  PURGE
L13091  CONTAINERS READ-LAYER JOIN
L13168  WRITE-LAYER GUARD DIALOGS
L13569  ADD COIN
L13873  ADD COIN PHASE 2
L14439  DOCKET RESEARCH QUEUE
L14813  FAKE DATA
L15097  PHOTO GALLERY & CROP PIPELINE
L16609  SECTION LOADING INDICATOR
L16645  SHARING
L16678  DASHBOARD
L20077  RECORD ACCORDIONS
L20526  BROWSE DETAIL — EDIT
L22890  ALBUMS
L24353  WISHLIST
L24519  NEEDS ATTENTION
L25302  STAGING REVIEW — P
L26313  STATS & VALUE
L26437  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L27327  FORMER HOLDINGS
L27788  RECEIPT
L28021  COMMIT A CAPTURED RECEIPT
L28869  PHOTO CROP ADJUSTER
L29099  STAGE 1 — BACKGROUND CROP
L29509  CROP PIPELINE ORCHESTRATOR
L29594  COMMIT A CAPTURED PHOTO
L29779  STORED PHOTOS IN THE CAPTURE UI
L29866  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L30473  PHOTOS WAIT FOR SAVE (O
L30882  CROP FROM AN UPLOADED PHOTO
L31390  GALLERY CAPTURE WIDGET
L31510  SUB-GROUP PHOTO SHEET
L31537  DRAFT MODE (A
L31862  ADD SET
L32013  ADD SET STEP 2
L32082  MANAGE PHOTOS
L32745  GALLERY DISPLAY
L32844  IN-APP MEDIA VIEWER
L33813  FILES PICKER + PHOTO GUARD (A
L33848  UNIFIED IMAGE CHOOSER (O
L33915  PHOTO SLOTS
L34042  ADD COIN
L34074  GRADE PICKER
L34143  DESCRIPTION AUTO-FILL
L34663  DESCRIPTION CONSISTENCY GATE (A
L34853  PCGS LABEL AUTO-POPULATE
L35465  DIRECT-WRITE
L35811  ADD COIN SAVE — P
L36339  EDITING AN EXISTING STAGING DRAFT (P
L36580  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L37431  YEAR PICKER
L37883  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8454
activeCoins  L8829
isExitStatus  L10465
ownedCoins  L10478
buildCoinDraft  L13635
coinDraftToAllValues  L13957
compositionLabelCandidates  L18074
setFittedCornerText  L18094
roundToCents  L21641
valueWithFaceFloor  L21683
refreshVarietyOptions  L34630
applyDbCoinsRowToForm  L34954
readAddCoinFormForDraft  L35690
refreshAddCoinCategoryUI  L16158
addCoinDirectSaveGaps  L35500
addCoinMatchResolved  L35533
addCoinGateMessage  L35522
saveCoinDraftEdit  L36024
resetAddCoinForm  L36205
applyCoinDraftToForm  L36403

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11072
saveCoinRowToWorkbook  L11458
writeCoinIdCell  L11648
setDraftFolder  L13419
coinDraftFolder  L13604
setFlipPhotoUrl  L15400
readBrowseEditForm  L21902
checkDesignationReresolution  L22782
collectionIdNumber  L25319
renderStagingList  L25358
promoteStagedCoin  L25678
rejectStagedCoin  L26262
findDbCoinsMatch  L34298
isVarietyRecognized  L34657
renderAmbiguousMatchList  L35081
isConfidentMatch  L35506
coinDraftPromoteGaps  L14167
allRowHoldsCoinDraft  L14190
coinOnLoadedAllSheet  L13796
coinDraftStaleOnAll  L13808
markCoinDraftAlreadyPromoted  L25814
finishCoinDraftWrite  L25758

## Add Set

getWriteToken  L9386
reservationIdNumber  L13351
addChildToSetDraft  L13529
plannedPromotionMoves  L14731
matchDbSetsByProductCode  L37974
dbSetTypeName  L37992
composeSetName  L38008
categoryFromLineage  L38048
readAddSetYear  L38515
resumeSetDraftAtStep1  L38638
startSetCapture  L38772
allSubGroupsFull  L38884
renderChildStep  L38890
readChildFormValues  L38998
restoreChildFormValues  L39013
saveCurrentChild  L39061

## Albums

mapWorkbookRowToDbSet  L8244
buildLiveAlbums  L8383
activeDbCoins  L8831
activeAlbums  L8947
setBrowseStepContext  L18556
resolveCoinAlbumLink  L19915
renderAlbumsList  L23113
initAlbums  L23168
computeAlbumPageRows  L23277
openAlbumAtPage  L23436
showAlbumDetail  L23521
slotMintage  L23552
formatAlbumMintage  L23573
renderSlotCell  L23777
turnAlbumPage  L24083
renderAlbumBook  L24180

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10827
ensureAllHeaderMap  L10845
ensureSheetHeaderMap  L12307
missingWriteColumns  L10863
assertNoFormulaCells  L10895
readAllRowForWrite  L10980
batchWriteError  L10784
partialSaveResult  L11149

refreshLiveCoinsAfterWrite  L9340
__setBrowseEditWriteEnabledForTest  L10575
excelSerialToday  L10626
workbookDateToday  L10665
localISODateToday  L10708
toWorkbookDate  L10715
__resetAllHeaderMapForTest  L10906
findAllSheetRowNumber  L10910
detectIdentityOverwrites  L11052
createAllSheetRow  L11900
writeOriginSetIdCell  L12094
writeRecordRow  L12397
resolveStorageLocation  L13148
showWriteGuard  L13175
promoteCoinDraftToAllSheetUnlocked  L14236
forceAddCoinDraft  L25928

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5842
getReferenceImageToken  L5896
fetchReferenceImageBlob  L5928
ensureReferenceImageFetch  L5959
__setSplashTimingsForTest  L6523
noteRetryAfter  L6553
abortStartupRequests  L6600
withRequestTimeout  L6607
refetchMissingLiveNavSheets  L8778
liveDataMode  L8920
saveDocketQueue  L14604
hasReferenceImage  L16896
applyRealReferenceImage  L17039

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9033
graph  L10301
loadDocketQueue  L14540
galleryFlipEntry  L15383
buildCertLookupUrl  L15652
spotlightCoinList  L16777
applyDiscContent  L16953
originSetIdKeysMatch  L19602
setChildrenFor  L19607
compositionTextFor  L19885
resolveChildParentSet  L19995
renderDetailAccordions  L20150
buildSetChildRow  L20819
catalogFunFactFor  L21401
formatCurrency  L21662
renderStats  L27075

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8020
buildLookupCategoryList  L8730
activeDbSets  L8830
coinMatchesSearchQuery  L17809
metalCategoryFor  L17981
coinsTabBaseRows  L18799
medalTabBaseRows  L18812
applyCoinsTabFilters  L18836
applySetsTabFilters  L18863
renderSetChecklist  L18887
rollYearNumber  L18944
applyRollsTabFilters  L18991
resetBrowseFilters  L19048
showBrowseTab  L19096
detailTitleText  L19729
ownedSetForSetId  L38126
applyAddSetContext  L38726

## CoinID matcher

activeLookupGraders  L8832
knownDbCoinsFinishValues  L22472
dbCoinsCandidatesFor  L22487
docketRecheckEntry  L24673
runWithButtonPending  L25714
promoteCoinDraft  L25881
recheckCoinDraftMatch  L26081
lookupDescriptionCandidates  L34205
normField  L34276
addCoinIdentityShape  L34315
currentAddCoinMatchState  L34374
checkDbCoinsMatch  L34400
resolveAddCoinCatalogMatch  L34512
parsePcgsLabel  L34883
updateSaveConfidenceUI  L35554
completeAddCoinSave  L35846

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9078
coinDetailsFor  L15029
setNavBack  L16349
navigate  L16411
initCabinet  L16705
updateDocketFob  L16738
resetSpotlightTimer  L17723
browseMetalTest  L18415
sortRollRows  L18957
rollsMetalTest  L18983
armLeaveGuard  L30235
mintMarkOtherSelected  L35234
selectMintMarkOther  L35238
buildSplashDiagnosticText  L37596
runSplashConnect  L37633
docketQueueReady  L37710

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L10311
__resetWorkbookWebUrlCacheForTest  L10320
getCachedFolderWebUrl  L10330
flagCoinIdNeedsRelink  L13071
listSetDrafts  L13512
dismissSetDraftGap  L13561
buildDocketEntry  L14631
docketOpenEntries  L14664
appendDocketEntry  L14674
coinMissingPhoto  L17848
wireStaticAccordionToggle  L21550
performBrowseEditWrite  L22140
renderNeedsAttentionHub  L24823
appendDocketRows  L25201
buildCoinRecordFromForm  L35666

## Flip card and corner labels

mapWorkbookRowToCoin  L8054
wireSideToggle  L17015
renderCornerLines  L17058
wrapTextToTwoLines  L17081
renderFittedCornerLines  L17143
renderTypeDenomCorner  L17355
gradeDesignationCornerText  L17504
applyFlipCorners  L17517
cornerClearsDisc  L18198
shrinkCornerToFit  L18258
setCompositionCornerText  L18361
renderBrowseGrid  L18558
toggleBrowseDetailSide  L19544
showBrowseDetail  L19737
isSetRow  L19931
escapeHtmlText  L27828

## Former Holdings and Purge

formerHoldings  L10514
writePurgedCell  L12127
patchRecordRow  L12435
readRecordRows  L12481
buildPhotoRowPatch  L12677
clearPhotoRowField  L12695
purgeablePhotosFor  L12758
fileRowsForPhotos  L12799
finalisePurgedFlag  L12857
purgeCoinPhotos  L12899
activeYearFilterState  L18743
yearRowTestAgainst  L18751
updateActiveYearFilterButtonUI  L18776
applyAfterYearFilterChange  L18780
browseStepListFallback  L19635
renderFormerHoldings  L27445

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10536
setSelectValuePreservingUnknown  L20999
coinValueFigure  L21706
ensureSpotPricesForMeltLabels  L21761
loadSpotPrices  L26339
renderSpotPrices  L26396
refreshLedgerValueTiles  L27192

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L12985
recordPromotedCoinRecords  L14105
seriesLabel  L16844
sanitizeSeriesName  L16875
referenceSeriesKey  L16879
showBrowseEditSetView  L21423
commitReceiptCapture  L28191
photoCommitTargetId  L29622
unsavedEditsForView  L30029
refreshEditSaveState  L30173
buildPhotoPairSlot  L31650
manageOpenEndedBlock  L32210
renderManagePhotos  L32389
renderManagePhotosInto  L32406
uploadCoinDraftPhotos  L35766
uploadDraftPhoto  L38765

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9237
checkSessionAgainstWorkbook  L7377
checkWorkbookVersion  L6863
deleteWorkbookCacheForWrite  L7747
fetchWorkbookSheetRows  L6633
fetchWorkbookVersion  L6817
finishCoinRowSave  L11436
fullReadVersionTrusted  L7449
gatedGraphClient  L7271
hashSheetValues  L7457
idbOpenCache  L7674
isMsalNetworkError  L7585
launchFromSavedCopy  L7837
loadWorkbookCacheRecord  L7801
noteFullReadReport  L6763
noteRecentRowWrite  L11197
noteSaveOutcome  L11288
onFullReadLanded  L7469
recordWorkbookVersionCheck  L6847
refreshSessionFromWorkbook  L7424
renderDocketDataLine  L7909
renderLagProbe  L7992
renderLoadReport  L6920
renderSessionState  L7540
rowsFromSheetValues  L6696
saveWorkbookCacheAfterRead  L7754
setConnectionTrouble  L7350
settleSavedCopyVersion  L7865
startLagProbe  L7960
tokenFailureAction  L7595
whenWritesAllowed  L7508
withRecentWrites  L11208
withSaveTiming  L7105
workbookSessionChecked  L7183
workbookWritesAllowed  L7187

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L8845
addCoinCatalogFinish  L35514
applyCoinDraftToForm  L36403
applyDbCoinsRowToForm  L34954
applyLiveNavOptionalRows  L8658
buildLookupFinishList  L8708
catalogFinishGroupKey  L18455
populateFinishOptions  L8852
refetchMissingLiveNavSheets  L8778
resetAddCoinForm  L36205
setSelectValuePreservingUnknown  L20999

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L11322
allRowForWriteFromDetail  L10993
claimedRows  L11827
createAllSheetRow  L11900
idbCacheDelete  L7717
keysNotVisibleError  L11845
keysNotVisibleRows  L11840
markCoinDraftAlreadyPromoted  L25814
markCoinDraftAlreadyPromotedUntimed  L25823
noteClaimedRow  L11831
noteOwnRowState  L11258
ownCellsMatch  L11240
ownStateIndex  L11273
readAllRowForSave  L11339
readAllRowForWrite  L10980
readBackLastModified  L11391
rowClaimedThisSession  L11832
rowGuessProblem  L11326
saveCoinRowToWorkbook  L11458
savedCopyDeleteStepName  L7327
serialToClockWithSeconds  L11382
startSaveWatch  L7040
stopSaveWatch  L7069
withLatestOwnState  L11278
writeRecordRow  L12397

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L9493
dropExcelSession  L9464
excelSessionIdForRequest  L9475
excelSessionRejection  L9580
excelSessionsApply  L9463
excelWorkbookFetch  L9600
noteExcelSessionEvent  L9450
postCreateSession  L9483
prepareExcelSessionForStep  L9548
promoteCoinDraftToAllSheetInStep  L14244
runWorkbookStep  L7239
sessionChangedError  L9590
startExcelSessionAfterLaunch  L9570
writeRecordRowInStep  L12400

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L29173
bakeBgCropFromOriginal  L29294
bgCropUntouched  L29281
blobIsJpeg  L29140
canvasToBlob  L29168
commitGalleryPhoto  L29638
decodeFullResOriented  L29149
describeGraphCall  L7122
draftRecropSource  L31632
ensureCoinPhotoThumb  L6195
ensureStoredThumbs  L30744
fetchCoinPhotoThumbBlob  L6179
galleryTypeTrimOnly  L29527
initBgCrop  L29367
initPhotoAdjuster  L29004
loadCropSourceBlob  L30924
openBgCrop  L29244
openPhotoAdjust  L28886
paintStoredThumbWhenReady  L32770
refreshBgCropSource  L29203
resetBgCropBox  L29232
runCropPipeline  L29528
showEntryInMediaViewer  L33199
showMediaViewerAt  L33098
smallCopyOf  L29160
storedTileFetch  L6212
uploadSizeText  L9652
