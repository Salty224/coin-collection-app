# Code map: app.html, function -> line (generated)

`app.html` is 39,967 lines. Generated from `85940b2` (the last (bs) code commit on `claude/crop-basics-bs`, merged to main by fast-forward 14 Nov 2026; the merge's docs commit does not touch app.html) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5597  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L6126  STORED PHOTOS / RECEIPTS
L6128  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6539  LIVE NAV DATA
L9489  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L10486  BROWSE EDIT WRITE LAYER
L11721  COINID RE-LINKING ON IDENTITY EDIT
L12159  SET ATTACH / DETACH — A
L12374  PHOTOS / RECEIPTS TABLE WRITE LAYER
L12867  PURGE
L13234  CONTAINERS READ-LAYER JOIN
L13311  WRITE-LAYER GUARD DIALOGS
L13719  ADD COIN
L14023  ADD COIN PHASE 2
L14589  DOCKET RESEARCH QUEUE
L14963  FAKE DATA
L15247  PHOTO GALLERY & CROP PIPELINE
L16759  SECTION LOADING INDICATOR
L16795  SHARING
L16828  DASHBOARD
L20227  RECORD ACCORDIONS
L20676  BROWSE DETAIL — EDIT
L23040  ALBUMS
L24503  WISHLIST
L24669  NEEDS ATTENTION
L25452  STAGING REVIEW — P
L26463  STATS & VALUE
L26587  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L27477  FORMER HOLDINGS
L27938  RECEIPT
L28171  COMMIT A CAPTURED RECEIPT
L29019  PHOTO CROP ADJUSTER
L29471  STAGE 1 — BACKGROUND CROP
L30220  CROP PIPELINE ORCHESTRATOR
L30307  COMMIT A CAPTURED PHOTO
L30492  STORED PHOTOS IN THE CAPTURE UI
L30579  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L31186  PHOTOS WAIT FOR SAVE (O
L31595  CROP FROM AN UPLOADED PHOTO
L32103  GALLERY CAPTURE WIDGET
L32223  SUB-GROUP PHOTO SHEET
L32250  DRAFT MODE (A
L32575  ADD SET
L32726  ADD SET STEP 2
L32795  MANAGE PHOTOS
L33458  GALLERY DISPLAY
L33557  IN-APP MEDIA VIEWER
L34526  FILES PICKER + PHOTO GUARD (A
L34561  UNIFIED IMAGE CHOOSER (O
L34628  PHOTO SLOTS
L34755  ADD COIN
L34787  GRADE PICKER
L34856  DESCRIPTION AUTO-FILL
L35376  DESCRIPTION CONSISTENCY GATE (A
L35566  PCGS LABEL AUTO-POPULATE
L36178  DIRECT-WRITE
L36524  ADD COIN SAVE — P
L37052  EDITING AN EXISTING STAGING DRAFT (P
L37293  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L38144  YEAR PICKER
L38596  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8597
activeCoins  L8972
isExitStatus  L10608
ownedCoins  L10621
buildCoinDraft  L13785
coinDraftToAllValues  L14107
compositionLabelCandidates  L18224
setFittedCornerText  L18244
roundToCents  L21791
valueWithFaceFloor  L21833
refreshVarietyOptions  L35343
applyDbCoinsRowToForm  L35667
readAddCoinFormForDraft  L36403
refreshAddCoinCategoryUI  L16308
addCoinDirectSaveGaps  L36213
addCoinMatchResolved  L36246
addCoinGateMessage  L36235
saveCoinDraftEdit  L36737
resetAddCoinForm  L36918
applyCoinDraftToForm  L37116

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11215
saveCoinRowToWorkbook  L11601
writeCoinIdCell  L11791
setDraftFolder  L13569
coinDraftFolder  L13754
setFlipPhotoUrl  L15550
readBrowseEditForm  L22052
checkDesignationReresolution  L22932
collectionIdNumber  L25469
renderStagingList  L25508
promoteStagedCoin  L25828
rejectStagedCoin  L26412
findDbCoinsMatch  L35011
isVarietyRecognized  L35370
renderAmbiguousMatchList  L35794
isConfidentMatch  L36219
coinDraftPromoteGaps  L14317
allRowHoldsCoinDraft  L14340
coinOnLoadedAllSheet  L13946
coinDraftStaleOnAll  L13958
markCoinDraftAlreadyPromoted  L25964
finishCoinDraftWrite  L25908

## Add Set

getWriteToken  L9529
reservationIdNumber  L13501
addChildToSetDraft  L13679
plannedPromotionMoves  L14881
matchDbSetsByProductCode  L38687
dbSetTypeName  L38705
composeSetName  L38721
categoryFromLineage  L38761
readAddSetYear  L39228
resumeSetDraftAtStep1  L39351
startSetCapture  L39485
allSubGroupsFull  L39597
renderChildStep  L39603
readChildFormValues  L39711
restoreChildFormValues  L39726
saveCurrentChild  L39774

## Albums

mapWorkbookRowToDbSet  L8387
buildLiveAlbums  L8526
activeDbCoins  L8974
activeAlbums  L9090
setBrowseStepContext  L18706
resolveCoinAlbumLink  L20065
renderAlbumsList  L23263
initAlbums  L23318
computeAlbumPageRows  L23427
openAlbumAtPage  L23586
showAlbumDetail  L23671
slotMintage  L23702
formatAlbumMintage  L23723
renderSlotCell  L23927
turnAlbumPage  L24233
renderAlbumBook  L24330

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10970
ensureAllHeaderMap  L10988
ensureSheetHeaderMap  L12450
missingWriteColumns  L11006
assertNoFormulaCells  L11038
readAllRowForWrite  L11123
batchWriteError  L10927
partialSaveResult  L11292

refreshLiveCoinsAfterWrite  L9483
__setBrowseEditWriteEnabledForTest  L10718
excelSerialToday  L10769
workbookDateToday  L10808
localISODateToday  L10851
toWorkbookDate  L10858
__resetAllHeaderMapForTest  L11049
findAllSheetRowNumber  L11053
detectIdentityOverwrites  L11195
createAllSheetRow  L12043
writeOriginSetIdCell  L12237
writeRecordRow  L12540
resolveStorageLocation  L13291
showWriteGuard  L13318
promoteCoinDraftToAllSheetUnlocked  L14386
forceAddCoinDraft  L26078

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5985
getReferenceImageToken  L6039
fetchReferenceImageBlob  L6071
ensureReferenceImageFetch  L6102
__setSplashTimingsForTest  L6666
noteRetryAfter  L6696
abortStartupRequests  L6743
withRequestTimeout  L6750
refetchMissingLiveNavSheets  L8921
liveDataMode  L9063
saveDocketQueue  L14754
hasReferenceImage  L17046
applyRealReferenceImage  L17189

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9176
graph  L10444
loadDocketQueue  L14690
galleryFlipEntry  L15533
buildCertLookupUrl  L15802
spotlightCoinList  L16927
applyDiscContent  L17103
originSetIdKeysMatch  L19752
setChildrenFor  L19757
compositionTextFor  L20035
resolveChildParentSet  L20145
renderDetailAccordions  L20300
buildSetChildRow  L20969
catalogFunFactFor  L21551
formatCurrency  L21812
renderStats  L27225

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8163
buildLookupCategoryList  L8873
activeDbSets  L8973
coinMatchesSearchQuery  L17959
metalCategoryFor  L18131
coinsTabBaseRows  L18949
medalTabBaseRows  L18962
applyCoinsTabFilters  L18986
applySetsTabFilters  L19013
renderSetChecklist  L19037
rollYearNumber  L19094
applyRollsTabFilters  L19141
resetBrowseFilters  L19198
showBrowseTab  L19246
detailTitleText  L19879
ownedSetForSetId  L38839
applyAddSetContext  L39439

## CoinID matcher

activeLookupGraders  L8975
knownDbCoinsFinishValues  L22622
dbCoinsCandidatesFor  L22637
docketRecheckEntry  L24823
runWithButtonPending  L25864
promoteCoinDraft  L26031
recheckCoinDraftMatch  L26231
lookupDescriptionCandidates  L34918
normField  L34989
addCoinIdentityShape  L35028
currentAddCoinMatchState  L35087
checkDbCoinsMatch  L35113
resolveAddCoinCatalogMatch  L35225
parsePcgsLabel  L35596
updateSaveConfidenceUI  L36267
completeAddCoinSave  L36559

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9221
coinDetailsFor  L15179
setNavBack  L16499
navigate  L16561
initCabinet  L16855
updateDocketFob  L16888
resetSpotlightTimer  L17873
browseMetalTest  L18565
sortRollRows  L19107
rollsMetalTest  L19133
armLeaveGuard  L30948
mintMarkOtherSelected  L35947
selectMintMarkOther  L35951
buildSplashDiagnosticText  L38309
runSplashConnect  L38346
docketQueueReady  L38423

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L10454
__resetWorkbookWebUrlCacheForTest  L10463
getCachedFolderWebUrl  L10473
flagCoinIdNeedsRelink  L13214
listSetDrafts  L13662
dismissSetDraftGap  L13711
buildDocketEntry  L14781
docketOpenEntries  L14814
appendDocketEntry  L14824
coinMissingPhoto  L17998
wireStaticAccordionToggle  L21700
performBrowseEditWrite  L22290
renderNeedsAttentionHub  L24973
appendDocketRows  L25351
buildCoinRecordFromForm  L36379

## Flip card and corner labels

mapWorkbookRowToCoin  L8197
wireSideToggle  L17165
renderCornerLines  L17208
wrapTextToTwoLines  L17231
renderFittedCornerLines  L17293
renderTypeDenomCorner  L17505
gradeDesignationCornerText  L17654
applyFlipCorners  L17667
cornerClearsDisc  L18348
shrinkCornerToFit  L18408
setCompositionCornerText  L18511
renderBrowseGrid  L18708
toggleBrowseDetailSide  L19694
showBrowseDetail  L19887
isSetRow  L20081
escapeHtmlText  L27978

## Former Holdings and Purge

formerHoldings  L10657
writePurgedCell  L12270
patchRecordRow  L12578
readRecordRows  L12624
buildPhotoRowPatch  L12820
clearPhotoRowField  L12838
purgeablePhotosFor  L12901
fileRowsForPhotos  L12942
finalisePurgedFlag  L13000
purgeCoinPhotos  L13042
activeYearFilterState  L18893
yearRowTestAgainst  L18901
updateActiveYearFilterButtonUI  L18926
applyAfterYearFilterChange  L18930
browseStepListFallback  L19785
renderFormerHoldings  L27595

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10679
setSelectValuePreservingUnknown  L21149
coinValueFigure  L21856
ensureSpotPricesForMeltLabels  L21911
loadSpotPrices  L26489
renderSpotPrices  L26546
refreshLedgerValueTiles  L27342

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13128
recordPromotedCoinRecords  L14255
seriesLabel  L16994
sanitizeSeriesName  L17025
referenceSeriesKey  L17029
showBrowseEditSetView  L21573
commitReceiptCapture  L28341
photoCommitTargetId  L30335
unsavedEditsForView  L30742
refreshEditSaveState  L30886
buildPhotoPairSlot  L32363
manageOpenEndedBlock  L32923
renderManagePhotos  L33102
renderManagePhotosInto  L33119
uploadCoinDraftPhotos  L36479
uploadDraftPhoto  L39478

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9380
checkSessionAgainstWorkbook  L7520
checkWorkbookVersion  L7006
deleteWorkbookCacheForWrite  L7890
fetchWorkbookSheetRows  L6776
fetchWorkbookVersion  L6960
finishCoinRowSave  L11579
fullReadVersionTrusted  L7592
gatedGraphClient  L7414
hashSheetValues  L7600
idbOpenCache  L7817
isMsalNetworkError  L7728
launchFromSavedCopy  L7980
loadWorkbookCacheRecord  L7944
noteFullReadReport  L6906
noteRecentRowWrite  L11340
noteSaveOutcome  L11431
onFullReadLanded  L7612
recordWorkbookVersionCheck  L6990
refreshSessionFromWorkbook  L7567
renderDocketDataLine  L8052
renderLagProbe  L8135
renderLoadReport  L7063
renderSessionState  L7683
rowsFromSheetValues  L6839
saveWorkbookCacheAfterRead  L7897
setConnectionTrouble  L7493
settleSavedCopyVersion  L8008
startLagProbe  L8103
tokenFailureAction  L7738
whenWritesAllowed  L7651
withRecentWrites  L11351
withSaveTiming  L7248
workbookSessionChecked  L7326
workbookWritesAllowed  L7330

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L8988
addCoinCatalogFinish  L36227
applyCoinDraftToForm  L37116
applyDbCoinsRowToForm  L35667
applyLiveNavOptionalRows  L8801
buildLookupFinishList  L8851
catalogFinishGroupKey  L18605
populateFinishOptions  L8995
refetchMissingLiveNavSheets  L8921
resetAddCoinForm  L36918
setSelectValuePreservingUnknown  L21149

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L11465
allRowForWriteFromDetail  L11136
claimedRows  L11970
createAllSheetRow  L12043
idbCacheDelete  L7860
keysNotVisibleError  L11988
keysNotVisibleRows  L11983
markCoinDraftAlreadyPromoted  L25964
markCoinDraftAlreadyPromotedUntimed  L25973
noteClaimedRow  L11974
noteOwnRowState  L11401
ownCellsMatch  L11383
ownStateIndex  L11416
readAllRowForSave  L11482
readAllRowForWrite  L11123
readBackLastModified  L11534
rowClaimedThisSession  L11975
rowGuessProblem  L11469
saveCoinRowToWorkbook  L11601
savedCopyDeleteStepName  L7470
serialToClockWithSeconds  L11525
startSaveWatch  L7183
stopSaveWatch  L7212
withLatestOwnState  L11421
writeRecordRow  L12540

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L9636
dropExcelSession  L9607
excelSessionIdForRequest  L9618
excelSessionRejection  L9723
excelSessionsApply  L9606
excelWorkbookFetch  L9743
noteExcelSessionEvent  L9593
postCreateSession  L9626
prepareExcelSessionForStep  L9691
promoteCoinDraftToAllSheetInStep  L14394
runWorkbookStep  L7382
sessionChangedError  L9733
startExcelSessionAfterLaunch  L9713
writeRecordRowInStep  L12543

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L29566
bakeBgCropFromOriginal  L29741
bgCropUntouched  L29724
blobIsJpeg  L29533
canvasToBlob  L29561
commitGalleryPhoto  L30351
decodeFullResOriented  L29542
describeGraphCall  L7265
draftRecropSource  L32345
ensureCoinPhotoThumb  L6338
ensureStoredThumbs  L31457
fetchCoinPhotoThumbBlob  L6322
galleryTypeTrimOnly  L30238
initBgCrop  L29961
initPhotoAdjuster  L29361
loadCropSourceBlob  L31637
openBgCrop  L29683
openPhotoAdjust  L29094
paintStoredThumbWhenReady  L33483
refreshBgCropSource  L29655
resetBgCropBox  L29671
runCropPipeline  L30239
showEntryInMediaViewer  L33912
showMediaViewerAt  L33811
smallCopyOf  L29553
storedTileFetch  L6355
uploadSizeText  L9795

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L29049
snapCropAngle  L29066
steppedCropAngle  L29060
steppedCropZoom  L29073
cropAngleText  L29055
blockCropLongPress  L29079
bgCropFitBounds  L29601
layoutBgCropStage  L29621
bgCropHandOffRect  L29782
nudgeBgCropBox  L29933
renderBgCrop  L29883
clampBgBox  L29953
bgCropViewSize  L29798
clampBgCropPan  L29799
resetBgCropView  L29804
rememberBgCropViewCentre  L29810
setBgCropView  L29819
bgCropHandlePoint  L29841
bgCropZoomStep  L29847
showBgCropRect  L29859
photoAdjustZoomToPos  L29207
photoAdjustPosToZoom  L29211
syncPhotoAdjustZoomSlider  L29214
placePhotoAdjustZoomTick  L29222
setPhotoAdjustZoom  L29233
clampPhotoAdjustOffsets  L29255
quickRotatePhotoAdjust  L29281
photoAdjustOutputSize  L29298
bakePhotoAdjustFromSource  L29308
bakePhotoAdjustFromOriginal  L29334
__getLastPhotoAdjustResultForTest  L29303
startCropFromUpload  L31706
showWriteGuard  L13318
