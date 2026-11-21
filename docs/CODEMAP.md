# Code map: app.html, function -> line (generated)

`app.html` is 41,050 lines. Generated from Build 4's branch `claude/build4-consistency-check` (code `2fa5ae8`, F-1, 21 Nov 2026; before that `67a9cc8`, Build 3) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5630  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L6159  STORED PHOTOS / RECEIPTS
L6161  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6572  LIVE NAV DATA
L7224  CONSISTENCY CHECK (B7, B
L10026  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L11048  BROWSE EDIT WRITE LAYER
L12285  COINID RE-LINKING ON IDENTITY EDIT
L12727  SET ATTACH / DETACH — A
L12942  PHOTOS / RECEIPTS TABLE WRITE LAYER
L13435  PURGE
L13802  CONTAINERS READ-LAYER JOIN
L13879  WRITE-LAYER GUARD DIALOGS
L14337  ADD COIN
L14641  ADD COIN PHASE 2
L15207  DOCKET RESEARCH QUEUE
L15589  FAKE DATA
L15873  PHOTO GALLERY & CROP PIPELINE
L17389  SECTION LOADING INDICATOR
L17425  SHARING
L17458  DASHBOARD
L20857  RECORD ACCORDIONS
L21306  BROWSE DETAIL — EDIT
L23670  ALBUMS
L25133  WISHLIST
L25299  NEEDS ATTENTION
L26082  STAGING REVIEW — P
L27134  STATS & VALUE
L27258  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L28148  FORMER HOLDINGS
L28609  RECEIPT
L28842  COMMIT A CAPTURED RECEIPT
L29690  PHOTO CROP ADJUSTER
L30142  STAGE 1 — BACKGROUND CROP
L30891  CROP PIPELINE ORCHESTRATOR
L30978  COMMIT A CAPTURED PHOTO
L31167  STORED PHOTOS IN THE CAPTURE UI
L31254  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L31864  PHOTOS WAIT FOR SAVE (O
L32279  CROP FROM AN UPLOADED PHOTO
L32787  GALLERY CAPTURE WIDGET
L32907  SUB-GROUP PHOTO SHEET
L32934  DRAFT MODE (A
L33265  ADD SET
L33416  ADD SET STEP 2
L33485  MANAGE PHOTOS
L34148  GALLERY DISPLAY
L34247  IN-APP MEDIA VIEWER
L35216  FILES PICKER + PHOTO GUARD (A
L35251  UNIFIED IMAGE CHOOSER (O
L35318  PHOTO SLOTS
L35445  ADD COIN
L35477  GRADE PICKER
L35546  DESCRIPTION AUTO-FILL
L36066  DESCRIPTION CONSISTENCY GATE (A
L36256  PCGS LABEL AUTO-POPULATE
L36868  DIRECT-WRITE
L37237  ADD COIN SAVE — P
L37877  EDITING AN EXISTING STAGING DRAFT (P
L38210  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L39091  YEAR PICKER
L39543  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L9134
activeCoins  L9509
isExitStatus  L11170
ownedCoins  L11183
buildCoinDraft  L14403
coinDraftToAllValues  L14725
compositionLabelCandidates  L18854
setFittedCornerText  L18874
roundToCents  L22421
valueWithFaceFloor  L22463
refreshVarietyOptions  L36033
applyDbCoinsRowToForm  L36357
readAddCoinFormForDraft  L37093
refreshAddCoinCategoryUI  L16934
addCoinDirectSaveGaps  L36903
addCoinMatchResolved  L36936
addCoinGateMessage  L36925
saveCoinDraftEdit  L37528
resetAddCoinForm  L37742
applyCoinDraftToForm  L38033

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11777
saveCoinRowToWorkbook  L12165
writeCoinIdCell  L12355
setDraftFolder  L14184
coinDraftFolder  L14372
setFlipPhotoUrl  L16176
readBrowseEditForm  L22682
checkDesignationReresolution  L23562
collectionIdNumber  L26099
renderStagingList  L26138
promoteStagedCoin  L26458
rejectStagedCoin  L27059
findDbCoinsMatch  L35701
isVarietyRecognized  L36060
renderAmbiguousMatchList  L36484
isConfidentMatch  L36909
coinDraftPromoteGaps  L14935
allRowHoldsCoinDraft  L14958
coinOnLoadedAllSheet  L14564
coinDraftStaleOnAll  L14576
markCoinDraftAlreadyPromoted  L26613
finishCoinDraftWrite  L26538

## Add Set

getWriteToken  L10066
reservationIdNumber  L14069
addChildToSetDraft  L14297
plannedPromotionMoves  L15499
matchDbSetsByProductCode  L39634
dbSetTypeName  L39652
composeSetName  L39668
categoryFromLineage  L39708
readAddSetYear  L40182
resumeSetDraftAtStep1  L40306
startSetCapture  L40517
allSubGroupsFull  L40668
renderChildStep  L40674
readChildFormValues  L40782
restoreChildFormValues  L40797
saveCurrentChild  L40845

## Albums

mapWorkbookRowToDbSet  L8924
buildLiveAlbums  L9063
activeDbCoins  L9511
activeAlbums  L9627
setBrowseStepContext  L19336
resolveCoinAlbumLink  L20695
renderAlbumsList  L23893
initAlbums  L23948
computeAlbumPageRows  L24057
openAlbumAtPage  L24216
showAlbumDetail  L24301
slotMintage  L24332
formatAlbumMintage  L24353
renderSlotCell  L24557
turnAlbumPage  L24863
renderAlbumBook  L24960

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L11532
ensureAllHeaderMap  L11550
ensureSheetHeaderMap  L13018
missingWriteColumns  L11568
assertNoFormulaCells  L11600
readAllRowForWrite  L11685
batchWriteError  L11489
partialSaveResult  L11854

refreshLiveCoinsAfterWrite  L10020
__setBrowseEditWriteEnabledForTest  L11280
excelSerialToday  L11331
workbookDateToday  L11370
localISODateToday  L11413
toWorkbookDate  L11420
__resetAllHeaderMapForTest  L11611
findAllSheetRowNumber  L11615
detectIdentityOverwrites  L11757
createAllSheetRow  L12611
writeOriginSetIdCell  L12805
writeRecordRow  L13108
resolveStorageLocation  L13859
showWriteGuard  L13886
promoteCoinDraftToAllSheetUnlocked  L15004
forceAddCoinDraft  L26726

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L6018
getReferenceImageToken  L6072
fetchReferenceImageBlob  L6104
ensureReferenceImageFetch  L6135
__setSplashTimingsForTest  L6699
noteRetryAfter  L6729
abortStartupRequests  L6776
withRequestTimeout  L6783
refetchMissingLiveNavSheets  L9458
liveDataMode  L9600
saveDocketQueue  L15372
hasReferenceImage  L17676
applyRealReferenceImage  L17819

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9713
graph  L11006
loadDocketQueue  L15308
galleryFlipEntry  L16159
buildCertLookupUrl  L16428
spotlightCoinList  L17557
applyDiscContent  L17733
originSetIdKeysMatch  L20382
setChildrenFor  L20387
compositionTextFor  L20665
resolveChildParentSet  L20775
renderDetailAccordions  L20930
buildSetChildRow  L21599
catalogFunFactFor  L22181
formatCurrency  L22442
renderStats  L27896

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8700
buildLookupCategoryList  L9410
activeDbSets  L9510
coinMatchesSearchQuery  L18589
metalCategoryFor  L18761
coinsTabBaseRows  L19579
medalTabBaseRows  L19592
applyCoinsTabFilters  L19616
applySetsTabFilters  L19643
renderSetChecklist  L19667
rollYearNumber  L19724
applyRollsTabFilters  L19771
resetBrowseFilters  L19828
showBrowseTab  L19876
detailTitleText  L20509
ownedSetForSetId  L39786
applyAddSetContext  L40394

## CoinID matcher

activeLookupGraders  L9512
knownDbCoinsFinishValues  L23252
dbCoinsCandidatesFor  L23267
docketRecheckEntry  L25453
runWithButtonPending  L26494
promoteCoinDraft  L26680
recheckCoinDraftMatch  L26878
lookupDescriptionCandidates  L35608
normField  L35679
addCoinIdentityShape  L35718
currentAddCoinMatchState  L35777
checkDbCoinsMatch  L35803
resolveAddCoinCatalogMatch  L35915
parsePcgsLabel  L36286
updateSaveConfidenceUI  L36957
completeAddCoinSave  L37282

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9758
coinDetailsFor  L15805
setNavBack  L17125
navigate  L17187
initCabinet  L17485
updateDocketFob  L17518
resetSpotlightTimer  L18503
browseMetalTest  L19195
sortRollRows  L19737
rollsMetalTest  L19763
armLeaveGuard  L31626
mintMarkOtherSelected  L36637
selectMintMarkOther  L36641
buildSplashDiagnosticText  L39256
runSplashConnect  L39293
docketQueueReady  L39370

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L11016
__resetWorkbookWebUrlCacheForTest  L11025
getCachedFolderWebUrl  L11035
flagCoinIdNeedsRelink  L13782
listSetDrafts  L14280
dismissSetDraftGap  L14329
buildDocketEntry  L15399
docketOpenEntries  L15432
appendDocketEntry  L15442
coinMissingPhoto  L18628
wireStaticAccordionToggle  L22330
performBrowseEditWrite  L22920
renderNeedsAttentionHub  L25603
appendDocketRows  L25981
buildCoinRecordFromForm  L37069

## Flip card and corner labels

mapWorkbookRowToCoin  L8734
wireSideToggle  L17795
renderCornerLines  L17838
wrapTextToTwoLines  L17861
renderFittedCornerLines  L17923
renderTypeDenomCorner  L18135
gradeDesignationCornerText  L18284
applyFlipCorners  L18297
cornerClearsDisc  L18978
shrinkCornerToFit  L19038
setCompositionCornerText  L19141
renderBrowseGrid  L19338
toggleBrowseDetailSide  L20324
showBrowseDetail  L20517
isSetRow  L20711
escapeHtmlText  L28649

## Former Holdings and Purge

formerHoldings  L11219
writePurgedCell  L12838
patchRecordRow  L13146
readRecordRows  L13192
buildPhotoRowPatch  L13388
clearPhotoRowField  L13406
purgeablePhotosFor  L13469
fileRowsForPhotos  L13510
finalisePurgedFlag  L13568
purgeCoinPhotos  L13610
activeYearFilterState  L19523
yearRowTestAgainst  L19531
updateActiveYearFilterButtonUI  L19556
applyAfterYearFilterChange  L19560
browseStepListFallback  L20415
renderFormerHoldings  L28266

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L11241
setSelectValuePreservingUnknown  L21779
coinValueFigure  L22486
ensureSpotPricesForMeltLabels  L22541
loadSpotPrices  L27160
renderSpotPrices  L27217
refreshLedgerValueTiles  L28013

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13696
recordPromotedCoinRecords  L14873
seriesLabel  L17624
sanitizeSeriesName  L17655
referenceSeriesKey  L17659
showBrowseEditSetView  L22203
commitReceiptCapture  L29012
photoCommitTargetId  L31006
unsavedEditsForView  L31417
refreshEditSaveState  L31564
buildPhotoPairSlot  L33053
manageOpenEndedBlock  L33613
renderManagePhotos  L33792
renderManagePhotosInto  L33809
uploadCoinDraftPhotos  L37178
uploadDraftPhoto  L40439

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9917
checkSessionAgainstWorkbook  L8057
checkWorkbookVersion  L7039
deleteWorkbookCacheForWrite  L8427
fetchWorkbookSheetRows  L6809
fetchWorkbookVersion  L6993
finishCoinRowSave  L12143
fullReadVersionTrusted  L8129
gatedGraphClient  L7951
hashSheetValues  L8137
idbOpenCache  L8354
isMsalNetworkError  L8265
launchFromSavedCopy  L8517
loadWorkbookCacheRecord  L8481
noteFullReadReport  L6939
noteRecentRowWrite  L11902
noteSaveOutcome  L11995
onFullReadLanded  L8149
recordWorkbookVersionCheck  L7023
refreshSessionFromWorkbook  L8104
renderDocketDataLine  L8589
renderLagProbe  L8672
renderLoadReport  L7096
renderSessionState  L8220
rowsFromSheetValues  L6872
saveWorkbookCacheAfterRead  L8434
setConnectionTrouble  L8030
settleSavedCopyVersion  L8545
startLagProbe  L8640
tokenFailureAction  L8275
whenWritesAllowed  L8188
withRecentWrites  L11913
withSaveTiming  L7785
workbookSessionChecked  L7863
workbookWritesAllowed  L7867

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L9525
addCoinCatalogFinish  L36917
applyCoinDraftToForm  L38033
applyDbCoinsRowToForm  L36357
applyLiveNavOptionalRows  L9338
buildLookupFinishList  L9388
catalogFinishGroupKey  L19235
populateFinishOptions  L9532
refetchMissingLiveNavSheets  L9458
resetAddCoinForm  L37742
setSelectValuePreservingUnknown  L21779

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L12029
allRowForWriteFromDetail  L11698
claimedRows  L12538
createAllSheetRow  L12611
idbCacheDelete  L8397
keysNotVisibleError  L12556
keysNotVisibleRows  L12551
markCoinDraftAlreadyPromoted  L26613
markCoinDraftAlreadyPromotedUntimed  L26622
noteClaimedRow  L12542
noteOwnRowState  L11965
ownCellsMatch  L11947
ownStateIndex  L11980
readAllRowForSave  L12046
readAllRowForWrite  L11685
readBackLastModified  L12098
rowClaimedThisSession  L12543
rowGuessProblem  L12033
saveCoinRowToWorkbook  L12165
savedCopyDeleteStepName  L8007
serialToClockWithSeconds  L12089
startSaveWatch  L7712
stopSaveWatch  L7741
withLatestOwnState  L11985
writeRecordRow  L13108

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L10173
dropExcelSession  L10144
excelSessionIdForRequest  L10155
excelSessionRejection  L10260
excelSessionsApply  L10143
excelWorkbookFetch  L10280
noteExcelSessionEvent  L10130
postCreateSession  L10163
prepareExcelSessionForStep  L10228
promoteCoinDraftToAllSheetInStep  L15012
runWorkbookStep  L7919
sessionChangedError  L10270
startExcelSessionAfterLaunch  L10250
writeRecordRowInStep  L13111

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L30237
bakeBgCropFromOriginal  L30412
bgCropUntouched  L30395
blobIsJpeg  L30204
canvasToBlob  L30232
commitGalleryPhoto  L31022
decodeFullResOriented  L30213
describeGraphCall  L7802
draftRecropSource  L33035
ensureCoinPhotoThumb  L6371
ensureStoredThumbs  L32141
fetchCoinPhotoThumbBlob  L6355
galleryTypeTrimOnly  L30909
initBgCrop  L30632
initPhotoAdjuster  L30032
loadCropSourceBlob  L32321
openBgCrop  L30354
openPhotoAdjust  L29765
paintStoredThumbWhenReady  L34173
refreshBgCropSource  L30326
resetBgCropBox  L30342
runCropPipeline  L30910
showEntryInMediaViewer  L34602
showMediaViewerAt  L34501
smallCopyOf  L30224
storedTileFetch  L6388
uploadSizeText  L10336

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L29720
snapCropAngle  L29737
steppedCropAngle  L29731
steppedCropZoom  L29744
cropAngleText  L29726
blockCropLongPress  L29750
bgCropFitBounds  L30272
layoutBgCropStage  L30292
bgCropHandOffRect  L30453
nudgeBgCropBox  L30604
renderBgCrop  L30554
clampBgBox  L30624
bgCropViewSize  L30469
clampBgCropPan  L30470
resetBgCropView  L30475
rememberBgCropViewCentre  L30481
setBgCropView  L30490
bgCropHandlePoint  L30512
bgCropZoomStep  L30518
showBgCropRect  L30530
photoAdjustZoomToPos  L29878
photoAdjustPosToZoom  L29882
syncPhotoAdjustZoomSlider  L29885
placePhotoAdjustZoomTick  L29893
setPhotoAdjustZoom  L29904
clampPhotoAdjustOffsets  L29926
quickRotatePhotoAdjust  L29952
photoAdjustOutputSize  L29969
bakePhotoAdjustFromSource  L29979
bakePhotoAdjustFromOriginal  L30005
__getLastPhotoAdjustResultForTest  L29974
startCropFromUpload  L32390
showWriteGuard  L13886

## Data safety part 1 (review Build 3: A1, A12, A2, A16, A4, B1, and the TEST round's B-1, F-1 to F-6; branch `claude/build3-data-safety`, 15-16 Nov 2026)

stagingFolderIdNumber  L14118
readMaxReservedIdFromStaging  L14121
newDraftToken  L14141
draftIdInUseError  L14146
writeNewDraftJson  L14151
uploadCoinDraftPhotos  L37178
uploadCoinDraftReceipt  L37219
completeAddCoinSaveUntimed  L37285
enterFirstSaveRetry  L37917
firstSavePhotoOrder  L37974
saveCoinDraftEdit  L37528
uploadStagingEditFiles  L38431
uploadDraftPhoto  L40439
startSetCapture  L40517
rejectOnAllRefusal  L27077
performRejectStagedCoin  L27093
writeNewRowKeyCells  L12399
finishCoinDraftWrite  L26538
refreshAfterCoinRowWrite  L26574
coinDraftNotClosedText  L26587
saveFailureReason  L7766
saveLogHeadline  L7189
saveLogStepLines  L7193
saveLogText  L7197
copySaveLog  L7204
photoSaveFailureText  L32088
addSetGalleryPhotosToSave  L40481
uploadSetGalleryPhotos  L40493
uploadSetDraftFile  L40444
setStartFilesText  L40642
startSetCaptureUntimed  L40523
saveCurrentChildUntimed  L40848
plannedPromotionMoves  L15499
recordPromotedSetRecords  L15542
addCoinSaveLabel  L37275
draftNotSavedText  L32951
showToast  L17377

## Consistency check (review Build 4: B7 + A19; branch `claude/build4-consistency-check`, 16 Nov 2026)

consistencyReadClient  L7252
consistencyReadTableRows  L7284
gatherConsistencyData  L7309
compareConsistency  L7362
consistencySectionCount  L7572
consistencyResultLines  L7579
consistencyResultText  L7608
renderConsistencyCheck  L7612
runConsistencyCheck  L7631
copyConsistencyResult  L7669
