# Code map: app.html, function -> line (generated)

`app.html` is 41,038 lines. Generated from Build 4's branch `claude/build4-consistency-check` (code `9d1a309`, 16 Nov 2026; before that `67a9cc8`, Build 3) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5626  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L6155  STORED PHOTOS / RECEIPTS
L6157  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6568  LIVE NAV DATA
L7220  CONSISTENCY CHECK (B7, B
L10014  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L11036  BROWSE EDIT WRITE LAYER
L12273  COINID RE-LINKING ON IDENTITY EDIT
L12715  SET ATTACH / DETACH — A
L12930  PHOTOS / RECEIPTS TABLE WRITE LAYER
L13423  PURGE
L13790  CONTAINERS READ-LAYER JOIN
L13867  WRITE-LAYER GUARD DIALOGS
L14325  ADD COIN
L14629  ADD COIN PHASE 2
L15195  DOCKET RESEARCH QUEUE
L15577  FAKE DATA
L15861  PHOTO GALLERY & CROP PIPELINE
L17377  SECTION LOADING INDICATOR
L17413  SHARING
L17446  DASHBOARD
L20845  RECORD ACCORDIONS
L21294  BROWSE DETAIL — EDIT
L23658  ALBUMS
L25121  WISHLIST
L25287  NEEDS ATTENTION
L26070  STAGING REVIEW — P
L27122  STATS & VALUE
L27246  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L28136  FORMER HOLDINGS
L28597  RECEIPT
L28830  COMMIT A CAPTURED RECEIPT
L29678  PHOTO CROP ADJUSTER
L30130  STAGE 1 — BACKGROUND CROP
L30879  CROP PIPELINE ORCHESTRATOR
L30966  COMMIT A CAPTURED PHOTO
L31155  STORED PHOTOS IN THE CAPTURE UI
L31242  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L31852  PHOTOS WAIT FOR SAVE (O
L32267  CROP FROM AN UPLOADED PHOTO
L32775  GALLERY CAPTURE WIDGET
L32895  SUB-GROUP PHOTO SHEET
L32922  DRAFT MODE (A
L33253  ADD SET
L33404  ADD SET STEP 2
L33473  MANAGE PHOTOS
L34136  GALLERY DISPLAY
L34235  IN-APP MEDIA VIEWER
L35204  FILES PICKER + PHOTO GUARD (A
L35239  UNIFIED IMAGE CHOOSER (O
L35306  PHOTO SLOTS
L35433  ADD COIN
L35465  GRADE PICKER
L35534  DESCRIPTION AUTO-FILL
L36054  DESCRIPTION CONSISTENCY GATE (A
L36244  PCGS LABEL AUTO-POPULATE
L36856  DIRECT-WRITE
L37225  ADD COIN SAVE — P
L37865  EDITING AN EXISTING STAGING DRAFT (P
L38198  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L39079  YEAR PICKER
L39531  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L9122
activeCoins  L9497
isExitStatus  L11158
ownedCoins  L11171
buildCoinDraft  L14391
coinDraftToAllValues  L14713
compositionLabelCandidates  L18842
setFittedCornerText  L18862
roundToCents  L22409
valueWithFaceFloor  L22451
refreshVarietyOptions  L36021
applyDbCoinsRowToForm  L36345
readAddCoinFormForDraft  L37081
refreshAddCoinCategoryUI  L16922
addCoinDirectSaveGaps  L36891
addCoinMatchResolved  L36924
addCoinGateMessage  L36913
saveCoinDraftEdit  L37516
resetAddCoinForm  L37730
applyCoinDraftToForm  L38021

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11765
saveCoinRowToWorkbook  L12153
writeCoinIdCell  L12343
setDraftFolder  L14172
coinDraftFolder  L14360
setFlipPhotoUrl  L16164
readBrowseEditForm  L22670
checkDesignationReresolution  L23550
collectionIdNumber  L26087
renderStagingList  L26126
promoteStagedCoin  L26446
rejectStagedCoin  L27047
findDbCoinsMatch  L35689
isVarietyRecognized  L36048
renderAmbiguousMatchList  L36472
isConfidentMatch  L36897
coinDraftPromoteGaps  L14923
allRowHoldsCoinDraft  L14946
coinOnLoadedAllSheet  L14552
coinDraftStaleOnAll  L14564
markCoinDraftAlreadyPromoted  L26601
finishCoinDraftWrite  L26526

## Add Set

getWriteToken  L10054
reservationIdNumber  L14057
addChildToSetDraft  L14285
plannedPromotionMoves  L15487
matchDbSetsByProductCode  L39622
dbSetTypeName  L39640
composeSetName  L39656
categoryFromLineage  L39696
readAddSetYear  L40170
resumeSetDraftAtStep1  L40294
startSetCapture  L40505
allSubGroupsFull  L40656
renderChildStep  L40662
readChildFormValues  L40770
restoreChildFormValues  L40785
saveCurrentChild  L40833

## Albums

mapWorkbookRowToDbSet  L8912
buildLiveAlbums  L9051
activeDbCoins  L9499
activeAlbums  L9615
setBrowseStepContext  L19324
resolveCoinAlbumLink  L20683
renderAlbumsList  L23881
initAlbums  L23936
computeAlbumPageRows  L24045
openAlbumAtPage  L24204
showAlbumDetail  L24289
slotMintage  L24320
formatAlbumMintage  L24341
renderSlotCell  L24545
turnAlbumPage  L24851
renderAlbumBook  L24948

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L11520
ensureAllHeaderMap  L11538
ensureSheetHeaderMap  L13006
missingWriteColumns  L11556
assertNoFormulaCells  L11588
readAllRowForWrite  L11673
batchWriteError  L11477
partialSaveResult  L11842

refreshLiveCoinsAfterWrite  L10008
__setBrowseEditWriteEnabledForTest  L11268
excelSerialToday  L11319
workbookDateToday  L11358
localISODateToday  L11401
toWorkbookDate  L11408
__resetAllHeaderMapForTest  L11599
findAllSheetRowNumber  L11603
detectIdentityOverwrites  L11745
createAllSheetRow  L12599
writeOriginSetIdCell  L12793
writeRecordRow  L13096
resolveStorageLocation  L13847
showWriteGuard  L13874
promoteCoinDraftToAllSheetUnlocked  L14992
forceAddCoinDraft  L26714

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L6014
getReferenceImageToken  L6068
fetchReferenceImageBlob  L6100
ensureReferenceImageFetch  L6131
__setSplashTimingsForTest  L6695
noteRetryAfter  L6725
abortStartupRequests  L6772
withRequestTimeout  L6779
refetchMissingLiveNavSheets  L9446
liveDataMode  L9588
saveDocketQueue  L15360
hasReferenceImage  L17664
applyRealReferenceImage  L17807

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9701
graph  L10994
loadDocketQueue  L15296
galleryFlipEntry  L16147
buildCertLookupUrl  L16416
spotlightCoinList  L17545
applyDiscContent  L17721
originSetIdKeysMatch  L20370
setChildrenFor  L20375
compositionTextFor  L20653
resolveChildParentSet  L20763
renderDetailAccordions  L20918
buildSetChildRow  L21587
catalogFunFactFor  L22169
formatCurrency  L22430
renderStats  L27884

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8688
buildLookupCategoryList  L9398
activeDbSets  L9498
coinMatchesSearchQuery  L18577
metalCategoryFor  L18749
coinsTabBaseRows  L19567
medalTabBaseRows  L19580
applyCoinsTabFilters  L19604
applySetsTabFilters  L19631
renderSetChecklist  L19655
rollYearNumber  L19712
applyRollsTabFilters  L19759
resetBrowseFilters  L19816
showBrowseTab  L19864
detailTitleText  L20497
ownedSetForSetId  L39774
applyAddSetContext  L40382

## CoinID matcher

activeLookupGraders  L9500
knownDbCoinsFinishValues  L23240
dbCoinsCandidatesFor  L23255
docketRecheckEntry  L25441
runWithButtonPending  L26482
promoteCoinDraft  L26668
recheckCoinDraftMatch  L26866
lookupDescriptionCandidates  L35596
normField  L35667
addCoinIdentityShape  L35706
currentAddCoinMatchState  L35765
checkDbCoinsMatch  L35791
resolveAddCoinCatalogMatch  L35903
parsePcgsLabel  L36274
updateSaveConfidenceUI  L36945
completeAddCoinSave  L37270

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9746
coinDetailsFor  L15793
setNavBack  L17113
navigate  L17175
initCabinet  L17473
updateDocketFob  L17506
resetSpotlightTimer  L18491
browseMetalTest  L19183
sortRollRows  L19725
rollsMetalTest  L19751
armLeaveGuard  L31614
mintMarkOtherSelected  L36625
selectMintMarkOther  L36629
buildSplashDiagnosticText  L39244
runSplashConnect  L39281
docketQueueReady  L39358

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L11004
__resetWorkbookWebUrlCacheForTest  L11013
getCachedFolderWebUrl  L11023
flagCoinIdNeedsRelink  L13770
listSetDrafts  L14268
dismissSetDraftGap  L14317
buildDocketEntry  L15387
docketOpenEntries  L15420
appendDocketEntry  L15430
coinMissingPhoto  L18616
wireStaticAccordionToggle  L22318
performBrowseEditWrite  L22908
renderNeedsAttentionHub  L25591
appendDocketRows  L25969
buildCoinRecordFromForm  L37057

## Flip card and corner labels

mapWorkbookRowToCoin  L8722
wireSideToggle  L17783
renderCornerLines  L17826
wrapTextToTwoLines  L17849
renderFittedCornerLines  L17911
renderTypeDenomCorner  L18123
gradeDesignationCornerText  L18272
applyFlipCorners  L18285
cornerClearsDisc  L18966
shrinkCornerToFit  L19026
setCompositionCornerText  L19129
renderBrowseGrid  L19326
toggleBrowseDetailSide  L20312
showBrowseDetail  L20505
isSetRow  L20699
escapeHtmlText  L28637

## Former Holdings and Purge

formerHoldings  L11207
writePurgedCell  L12826
patchRecordRow  L13134
readRecordRows  L13180
buildPhotoRowPatch  L13376
clearPhotoRowField  L13394
purgeablePhotosFor  L13457
fileRowsForPhotos  L13498
finalisePurgedFlag  L13556
purgeCoinPhotos  L13598
activeYearFilterState  L19511
yearRowTestAgainst  L19519
updateActiveYearFilterButtonUI  L19544
applyAfterYearFilterChange  L19548
browseStepListFallback  L20403
renderFormerHoldings  L28254

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L11229
setSelectValuePreservingUnknown  L21767
coinValueFigure  L22474
ensureSpotPricesForMeltLabels  L22529
loadSpotPrices  L27148
renderSpotPrices  L27205
refreshLedgerValueTiles  L28001

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13684
recordPromotedCoinRecords  L14861
seriesLabel  L17612
sanitizeSeriesName  L17643
referenceSeriesKey  L17647
showBrowseEditSetView  L22191
commitReceiptCapture  L29000
photoCommitTargetId  L30994
unsavedEditsForView  L31405
refreshEditSaveState  L31552
buildPhotoPairSlot  L33041
manageOpenEndedBlock  L33601
renderManagePhotos  L33780
renderManagePhotosInto  L33797
uploadCoinDraftPhotos  L37166
uploadDraftPhoto  L40427

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9905
checkSessionAgainstWorkbook  L8045
checkWorkbookVersion  L7035
deleteWorkbookCacheForWrite  L8415
fetchWorkbookSheetRows  L6805
fetchWorkbookVersion  L6989
finishCoinRowSave  L12131
fullReadVersionTrusted  L8117
gatedGraphClient  L7939
hashSheetValues  L8125
idbOpenCache  L8342
isMsalNetworkError  L8253
launchFromSavedCopy  L8505
loadWorkbookCacheRecord  L8469
noteFullReadReport  L6935
noteRecentRowWrite  L11890
noteSaveOutcome  L11983
onFullReadLanded  L8137
recordWorkbookVersionCheck  L7019
refreshSessionFromWorkbook  L8092
renderDocketDataLine  L8577
renderLagProbe  L8660
renderLoadReport  L7092
renderSessionState  L8208
rowsFromSheetValues  L6868
saveWorkbookCacheAfterRead  L8422
setConnectionTrouble  L8018
settleSavedCopyVersion  L8533
startLagProbe  L8628
tokenFailureAction  L8263
whenWritesAllowed  L8176
withRecentWrites  L11901
withSaveTiming  L7773
workbookSessionChecked  L7851
workbookWritesAllowed  L7855

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L9513
addCoinCatalogFinish  L36905
applyCoinDraftToForm  L38021
applyDbCoinsRowToForm  L36345
applyLiveNavOptionalRows  L9326
buildLookupFinishList  L9376
catalogFinishGroupKey  L19223
populateFinishOptions  L9520
refetchMissingLiveNavSheets  L9446
resetAddCoinForm  L37730
setSelectValuePreservingUnknown  L21767

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L12017
allRowForWriteFromDetail  L11686
claimedRows  L12526
createAllSheetRow  L12599
idbCacheDelete  L8385
keysNotVisibleError  L12544
keysNotVisibleRows  L12539
markCoinDraftAlreadyPromoted  L26601
markCoinDraftAlreadyPromotedUntimed  L26610
noteClaimedRow  L12530
noteOwnRowState  L11953
ownCellsMatch  L11935
ownStateIndex  L11968
readAllRowForSave  L12034
readAllRowForWrite  L11673
readBackLastModified  L12086
rowClaimedThisSession  L12531
rowGuessProblem  L12021
saveCoinRowToWorkbook  L12153
savedCopyDeleteStepName  L7995
serialToClockWithSeconds  L12077
startSaveWatch  L7700
stopSaveWatch  L7729
withLatestOwnState  L11973
writeRecordRow  L13096

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L10161
dropExcelSession  L10132
excelSessionIdForRequest  L10143
excelSessionRejection  L10248
excelSessionsApply  L10131
excelWorkbookFetch  L10268
noteExcelSessionEvent  L10118
postCreateSession  L10151
prepareExcelSessionForStep  L10216
promoteCoinDraftToAllSheetInStep  L15000
runWorkbookStep  L7907
sessionChangedError  L10258
startExcelSessionAfterLaunch  L10238
writeRecordRowInStep  L13099

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L30225
bakeBgCropFromOriginal  L30400
bgCropUntouched  L30383
blobIsJpeg  L30192
canvasToBlob  L30220
commitGalleryPhoto  L31010
decodeFullResOriented  L30201
describeGraphCall  L7790
draftRecropSource  L33023
ensureCoinPhotoThumb  L6367
ensureStoredThumbs  L32129
fetchCoinPhotoThumbBlob  L6351
galleryTypeTrimOnly  L30897
initBgCrop  L30620
initPhotoAdjuster  L30020
loadCropSourceBlob  L32309
openBgCrop  L30342
openPhotoAdjust  L29753
paintStoredThumbWhenReady  L34161
refreshBgCropSource  L30314
resetBgCropBox  L30330
runCropPipeline  L30898
showEntryInMediaViewer  L34590
showMediaViewerAt  L34489
smallCopyOf  L30212
storedTileFetch  L6384
uploadSizeText  L10324

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L29708
snapCropAngle  L29725
steppedCropAngle  L29719
steppedCropZoom  L29732
cropAngleText  L29714
blockCropLongPress  L29738
bgCropFitBounds  L30260
layoutBgCropStage  L30280
bgCropHandOffRect  L30441
nudgeBgCropBox  L30592
renderBgCrop  L30542
clampBgBox  L30612
bgCropViewSize  L30457
clampBgCropPan  L30458
resetBgCropView  L30463
rememberBgCropViewCentre  L30469
setBgCropView  L30478
bgCropHandlePoint  L30500
bgCropZoomStep  L30506
showBgCropRect  L30518
photoAdjustZoomToPos  L29866
photoAdjustPosToZoom  L29870
syncPhotoAdjustZoomSlider  L29873
placePhotoAdjustZoomTick  L29881
setPhotoAdjustZoom  L29892
clampPhotoAdjustOffsets  L29914
quickRotatePhotoAdjust  L29940
photoAdjustOutputSize  L29957
bakePhotoAdjustFromSource  L29967
bakePhotoAdjustFromOriginal  L29993
__getLastPhotoAdjustResultForTest  L29962
startCropFromUpload  L32378
showWriteGuard  L13874

## Data safety part 1 (review Build 3: A1, A12, A2, A16, A4, B1, and the TEST round's B-1, F-1 to F-6; branch `claude/build3-data-safety`, 15-16 Nov 2026)

stagingFolderIdNumber  L14106
readMaxReservedIdFromStaging  L14109
newDraftToken  L14129
draftIdInUseError  L14134
writeNewDraftJson  L14139
uploadCoinDraftPhotos  L37166
uploadCoinDraftReceipt  L37207
completeAddCoinSaveUntimed  L37273
enterFirstSaveRetry  L37905
firstSavePhotoOrder  L37962
saveCoinDraftEdit  L37516
uploadStagingEditFiles  L38419
uploadDraftPhoto  L40427
startSetCapture  L40505
rejectOnAllRefusal  L27065
performRejectStagedCoin  L27081
writeNewRowKeyCells  L12387
finishCoinDraftWrite  L26526
refreshAfterCoinRowWrite  L26562
coinDraftNotClosedText  L26575
saveFailureReason  L7754
saveLogHeadline  L7185
saveLogStepLines  L7189
saveLogText  L7193
copySaveLog  L7200
photoSaveFailureText  L32076
addSetGalleryPhotosToSave  L40469
uploadSetGalleryPhotos  L40481
uploadSetDraftFile  L40432
setStartFilesText  L40630
startSetCaptureUntimed  L40511
saveCurrentChildUntimed  L40836
plannedPromotionMoves  L15487
recordPromotedSetRecords  L15530
addCoinSaveLabel  L37263
draftNotSavedText  L32939
showToast  L17365

## Consistency check (review Build 4: B7 + A19; branch `claude/build4-consistency-check`, 16 Nov 2026)

consistencyReadClient  L7248
consistencyReadTableRows  L7280
gatherConsistencyData  L7305
compareConsistency  L7358
consistencySectionCount  L7568
consistencyResultLines  L7575
consistencyResultText  L7604
renderConsistencyCheck  L7608
runConsistencyCheck  L7622
copyConsistencyResult  L7657
