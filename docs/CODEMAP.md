# Code map: app.html, function -> line (generated)

`app.html` is 40,551 lines. Generated from `67a9cc8` (Build 3's TEST-round code commit on `claude/build3-data-safety`, 16 Nov 2026; not merged yet) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L9536  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L10558  BROWSE EDIT WRITE LAYER
L11793  COINID RE-LINKING ON IDENTITY EDIT
L12235  SET ATTACH / DETACH — A
L12450  PHOTOS / RECEIPTS TABLE WRITE LAYER
L12943  PURGE
L13310  CONTAINERS READ-LAYER JOIN
L13387  WRITE-LAYER GUARD DIALOGS
L13845  ADD COIN
L14149  ADD COIN PHASE 2
L14715  DOCKET RESEARCH QUEUE
L15097  FAKE DATA
L15381  PHOTO GALLERY & CROP PIPELINE
L16897  SECTION LOADING INDICATOR
L16933  SHARING
L16966  DASHBOARD
L20365  RECORD ACCORDIONS
L20814  BROWSE DETAIL — EDIT
L23178  ALBUMS
L24641  WISHLIST
L24807  NEEDS ATTENTION
L25590  STAGING REVIEW — P
L26642  STATS & VALUE
L26766  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L27656  FORMER HOLDINGS
L28117  RECEIPT
L28350  COMMIT A CAPTURED RECEIPT
L29198  PHOTO CROP ADJUSTER
L29650  STAGE 1 — BACKGROUND CROP
L30399  CROP PIPELINE ORCHESTRATOR
L30486  COMMIT A CAPTURED PHOTO
L30675  STORED PHOTOS IN THE CAPTURE UI
L30762  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L31372  PHOTOS WAIT FOR SAVE (O
L31787  CROP FROM AN UPLOADED PHOTO
L32295  GALLERY CAPTURE WIDGET
L32415  SUB-GROUP PHOTO SHEET
L32442  DRAFT MODE (A
L32773  ADD SET
L32924  ADD SET STEP 2
L32993  MANAGE PHOTOS
L33656  GALLERY DISPLAY
L33755  IN-APP MEDIA VIEWER
L34724  FILES PICKER + PHOTO GUARD (A
L34759  UNIFIED IMAGE CHOOSER (O
L34826  PHOTO SLOTS
L34953  ADD COIN
L34985  GRADE PICKER
L35054  DESCRIPTION AUTO-FILL
L35574  DESCRIPTION CONSISTENCY GATE (A
L35764  PCGS LABEL AUTO-POPULATE
L36376  DIRECT-WRITE
L36745  ADD COIN SAVE — P
L37385  EDITING AN EXISTING STAGING DRAFT (P
L37718  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L38599  YEAR PICKER
L39051  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8644
activeCoins  L9019
isExitStatus  L10680
ownedCoins  L10693
buildCoinDraft  L13911
coinDraftToAllValues  L14233
compositionLabelCandidates  L18362
setFittedCornerText  L18382
roundToCents  L21929
valueWithFaceFloor  L21971
refreshVarietyOptions  L35541
applyDbCoinsRowToForm  L35865
readAddCoinFormForDraft  L36601
refreshAddCoinCategoryUI  L16442
addCoinDirectSaveGaps  L36411
addCoinMatchResolved  L36444
addCoinGateMessage  L36433
saveCoinDraftEdit  L37036
resetAddCoinForm  L37250
applyCoinDraftToForm  L37541

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11287
saveCoinRowToWorkbook  L11673
writeCoinIdCell  L11863
setDraftFolder  L13692
coinDraftFolder  L13880
setFlipPhotoUrl  L15684
readBrowseEditForm  L22190
checkDesignationReresolution  L23070
collectionIdNumber  L25607
renderStagingList  L25646
promoteStagedCoin  L25966
rejectStagedCoin  L26567
findDbCoinsMatch  L35209
isVarietyRecognized  L35568
renderAmbiguousMatchList  L35992
isConfidentMatch  L36417
coinDraftPromoteGaps  L14443
allRowHoldsCoinDraft  L14466
coinOnLoadedAllSheet  L14072
coinDraftStaleOnAll  L14084
markCoinDraftAlreadyPromoted  L26121
finishCoinDraftWrite  L26046

## Add Set

getWriteToken  L9576
reservationIdNumber  L13577
addChildToSetDraft  L13805
plannedPromotionMoves  L15007
matchDbSetsByProductCode  L39142
dbSetTypeName  L39160
composeSetName  L39176
categoryFromLineage  L39216
readAddSetYear  L39690
resumeSetDraftAtStep1  L39814
startSetCapture  L40025
allSubGroupsFull  L40176
renderChildStep  L40182
readChildFormValues  L40290
restoreChildFormValues  L40305
saveCurrentChild  L40353

## Albums

mapWorkbookRowToDbSet  L8434
buildLiveAlbums  L8573
activeDbCoins  L9021
activeAlbums  L9137
setBrowseStepContext  L18844
resolveCoinAlbumLink  L20203
renderAlbumsList  L23401
initAlbums  L23456
computeAlbumPageRows  L23565
openAlbumAtPage  L23724
showAlbumDetail  L23809
slotMintage  L23840
formatAlbumMintage  L23861
renderSlotCell  L24065
turnAlbumPage  L24371
renderAlbumBook  L24468

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L11042
ensureAllHeaderMap  L11060
ensureSheetHeaderMap  L12526
missingWriteColumns  L11078
assertNoFormulaCells  L11110
readAllRowForWrite  L11195
batchWriteError  L10999
partialSaveResult  L11364

refreshLiveCoinsAfterWrite  L9530
__setBrowseEditWriteEnabledForTest  L10790
excelSerialToday  L10841
workbookDateToday  L10880
localISODateToday  L10923
toWorkbookDate  L10930
__resetAllHeaderMapForTest  L11121
findAllSheetRowNumber  L11125
detectIdentityOverwrites  L11267
createAllSheetRow  L12119
writeOriginSetIdCell  L12313
writeRecordRow  L12616
resolveStorageLocation  L13367
showWriteGuard  L13394
promoteCoinDraftToAllSheetUnlocked  L14512
forceAddCoinDraft  L26234

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5985
getReferenceImageToken  L6039
fetchReferenceImageBlob  L6071
ensureReferenceImageFetch  L6102
__setSplashTimingsForTest  L6666
noteRetryAfter  L6696
abortStartupRequests  L6743
withRequestTimeout  L6750
refetchMissingLiveNavSheets  L8968
liveDataMode  L9110
saveDocketQueue  L14880
hasReferenceImage  L17184
applyRealReferenceImage  L17327

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9223
graph  L10516
loadDocketQueue  L14816
galleryFlipEntry  L15667
buildCertLookupUrl  L15936
spotlightCoinList  L17065
applyDiscContent  L17241
originSetIdKeysMatch  L19890
setChildrenFor  L19895
compositionTextFor  L20173
resolveChildParentSet  L20283
renderDetailAccordions  L20438
buildSetChildRow  L21107
catalogFunFactFor  L21689
formatCurrency  L21950
renderStats  L27404

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8210
buildLookupCategoryList  L8920
activeDbSets  L9020
coinMatchesSearchQuery  L18097
metalCategoryFor  L18269
coinsTabBaseRows  L19087
medalTabBaseRows  L19100
applyCoinsTabFilters  L19124
applySetsTabFilters  L19151
renderSetChecklist  L19175
rollYearNumber  L19232
applyRollsTabFilters  L19279
resetBrowseFilters  L19336
showBrowseTab  L19384
detailTitleText  L20017
ownedSetForSetId  L39294
applyAddSetContext  L39902

## CoinID matcher

activeLookupGraders  L9022
knownDbCoinsFinishValues  L22760
dbCoinsCandidatesFor  L22775
docketRecheckEntry  L24961
runWithButtonPending  L26002
promoteCoinDraft  L26188
recheckCoinDraftMatch  L26386
lookupDescriptionCandidates  L35116
normField  L35187
addCoinIdentityShape  L35226
currentAddCoinMatchState  L35285
checkDbCoinsMatch  L35311
resolveAddCoinCatalogMatch  L35423
parsePcgsLabel  L35794
updateSaveConfidenceUI  L36465
completeAddCoinSave  L36790

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9268
coinDetailsFor  L15313
setNavBack  L16633
navigate  L16695
initCabinet  L16993
updateDocketFob  L17026
resetSpotlightTimer  L18011
browseMetalTest  L18703
sortRollRows  L19245
rollsMetalTest  L19271
armLeaveGuard  L31134
mintMarkOtherSelected  L36145
selectMintMarkOther  L36149
buildSplashDiagnosticText  L38764
runSplashConnect  L38801
docketQueueReady  L38878

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L10526
__resetWorkbookWebUrlCacheForTest  L10535
getCachedFolderWebUrl  L10545
flagCoinIdNeedsRelink  L13290
listSetDrafts  L13788
dismissSetDraftGap  L13837
buildDocketEntry  L14907
docketOpenEntries  L14940
appendDocketEntry  L14950
coinMissingPhoto  L18136
wireStaticAccordionToggle  L21838
performBrowseEditWrite  L22428
renderNeedsAttentionHub  L25111
appendDocketRows  L25489
buildCoinRecordFromForm  L36577

## Flip card and corner labels

mapWorkbookRowToCoin  L8244
wireSideToggle  L17303
renderCornerLines  L17346
wrapTextToTwoLines  L17369
renderFittedCornerLines  L17431
renderTypeDenomCorner  L17643
gradeDesignationCornerText  L17792
applyFlipCorners  L17805
cornerClearsDisc  L18486
shrinkCornerToFit  L18546
setCompositionCornerText  L18649
renderBrowseGrid  L18846
toggleBrowseDetailSide  L19832
showBrowseDetail  L20025
isSetRow  L20219
escapeHtmlText  L28157

## Former Holdings and Purge

formerHoldings  L10729
writePurgedCell  L12346
patchRecordRow  L12654
readRecordRows  L12700
buildPhotoRowPatch  L12896
clearPhotoRowField  L12914
purgeablePhotosFor  L12977
fileRowsForPhotos  L13018
finalisePurgedFlag  L13076
purgeCoinPhotos  L13118
activeYearFilterState  L19031
yearRowTestAgainst  L19039
updateActiveYearFilterButtonUI  L19064
applyAfterYearFilterChange  L19068
browseStepListFallback  L19923
renderFormerHoldings  L27774

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10751
setSelectValuePreservingUnknown  L21287
coinValueFigure  L21994
ensureSpotPricesForMeltLabels  L22049
loadSpotPrices  L26668
renderSpotPrices  L26725
refreshLedgerValueTiles  L27521

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13204
recordPromotedCoinRecords  L14381
seriesLabel  L17132
sanitizeSeriesName  L17163
referenceSeriesKey  L17167
showBrowseEditSetView  L21711
commitReceiptCapture  L28520
photoCommitTargetId  L30514
unsavedEditsForView  L30925
refreshEditSaveState  L31072
buildPhotoPairSlot  L32561
manageOpenEndedBlock  L33121
renderManagePhotos  L33300
renderManagePhotosInto  L33317
uploadCoinDraftPhotos  L36686
uploadDraftPhoto  L39947

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9427
checkSessionAgainstWorkbook  L7567
checkWorkbookVersion  L7006
deleteWorkbookCacheForWrite  L7937
fetchWorkbookSheetRows  L6776
fetchWorkbookVersion  L6960
finishCoinRowSave  L11651
fullReadVersionTrusted  L7639
gatedGraphClient  L7461
hashSheetValues  L7647
idbOpenCache  L7864
isMsalNetworkError  L7775
launchFromSavedCopy  L8027
loadWorkbookCacheRecord  L7991
noteFullReadReport  L6906
noteRecentRowWrite  L11412
noteSaveOutcome  L11503
onFullReadLanded  L7659
recordWorkbookVersionCheck  L6990
refreshSessionFromWorkbook  L7614
renderDocketDataLine  L8099
renderLagProbe  L8182
renderLoadReport  L7063
renderSessionState  L7730
rowsFromSheetValues  L6839
saveWorkbookCacheAfterRead  L7944
setConnectionTrouble  L7540
settleSavedCopyVersion  L8055
startLagProbe  L8150
tokenFailureAction  L7785
whenWritesAllowed  L7698
withRecentWrites  L11423
withSaveTiming  L7295
workbookSessionChecked  L7373
workbookWritesAllowed  L7377

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L9035
addCoinCatalogFinish  L36425
applyCoinDraftToForm  L37541
applyDbCoinsRowToForm  L35865
applyLiveNavOptionalRows  L8848
buildLookupFinishList  L8898
catalogFinishGroupKey  L18743
populateFinishOptions  L9042
refetchMissingLiveNavSheets  L8968
resetAddCoinForm  L37250
setSelectValuePreservingUnknown  L21287

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L11537
allRowForWriteFromDetail  L11208
claimedRows  L12046
createAllSheetRow  L12119
idbCacheDelete  L7907
keysNotVisibleError  L12064
keysNotVisibleRows  L12059
markCoinDraftAlreadyPromoted  L26121
markCoinDraftAlreadyPromotedUntimed  L26130
noteClaimedRow  L12050
noteOwnRowState  L11473
ownCellsMatch  L11455
ownStateIndex  L11488
readAllRowForSave  L11554
readAllRowForWrite  L11195
readBackLastModified  L11606
rowClaimedThisSession  L12051
rowGuessProblem  L11541
saveCoinRowToWorkbook  L11673
savedCopyDeleteStepName  L7517
serialToClockWithSeconds  L11597
startSaveWatch  L7222
stopSaveWatch  L7251
withLatestOwnState  L11493
writeRecordRow  L12616

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L9683
dropExcelSession  L9654
excelSessionIdForRequest  L9665
excelSessionRejection  L9770
excelSessionsApply  L9653
excelWorkbookFetch  L9790
noteExcelSessionEvent  L9640
postCreateSession  L9673
prepareExcelSessionForStep  L9738
promoteCoinDraftToAllSheetInStep  L14520
runWorkbookStep  L7429
sessionChangedError  L9780
startExcelSessionAfterLaunch  L9760
writeRecordRowInStep  L12619

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L29745
bakeBgCropFromOriginal  L29920
bgCropUntouched  L29903
blobIsJpeg  L29712
canvasToBlob  L29740
commitGalleryPhoto  L30530
decodeFullResOriented  L29721
describeGraphCall  L7312
draftRecropSource  L32543
ensureCoinPhotoThumb  L6338
ensureStoredThumbs  L31649
fetchCoinPhotoThumbBlob  L6322
galleryTypeTrimOnly  L30417
initBgCrop  L30140
initPhotoAdjuster  L29540
loadCropSourceBlob  L31829
openBgCrop  L29862
openPhotoAdjust  L29273
paintStoredThumbWhenReady  L33681
refreshBgCropSource  L29834
resetBgCropBox  L29850
runCropPipeline  L30418
showEntryInMediaViewer  L34110
showMediaViewerAt  L34009
smallCopyOf  L29732
storedTileFetch  L6355
uploadSizeText  L9846

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L29228
snapCropAngle  L29245
steppedCropAngle  L29239
steppedCropZoom  L29252
cropAngleText  L29234
blockCropLongPress  L29258
bgCropFitBounds  L29780
layoutBgCropStage  L29800
bgCropHandOffRect  L29961
nudgeBgCropBox  L30112
renderBgCrop  L30062
clampBgBox  L30132
bgCropViewSize  L29977
clampBgCropPan  L29978
resetBgCropView  L29983
rememberBgCropViewCentre  L29989
setBgCropView  L29998
bgCropHandlePoint  L30020
bgCropZoomStep  L30026
showBgCropRect  L30038
photoAdjustZoomToPos  L29386
photoAdjustPosToZoom  L29390
syncPhotoAdjustZoomSlider  L29393
placePhotoAdjustZoomTick  L29401
setPhotoAdjustZoom  L29412
clampPhotoAdjustOffsets  L29434
quickRotatePhotoAdjust  L29460
photoAdjustOutputSize  L29477
bakePhotoAdjustFromSource  L29487
bakePhotoAdjustFromOriginal  L29513
__getLastPhotoAdjustResultForTest  L29482
startCropFromUpload  L31898
showWriteGuard  L13394

## Data safety part 1 (review Build 3: A1, A12, A2, A16, A4, B1, and the TEST round's B-1, F-1 to F-6; branch `claude/build3-data-safety`, 15-16 Nov 2026)

stagingFolderIdNumber  L13626
readMaxReservedIdFromStaging  L13629
newDraftToken  L13649
draftIdInUseError  L13654
writeNewDraftJson  L13659
uploadCoinDraftPhotos  L36686
uploadCoinDraftReceipt  L36727
completeAddCoinSaveUntimed  L36793
enterFirstSaveRetry  L37425
firstSavePhotoOrder  L37482
saveCoinDraftEdit  L37036
uploadStagingEditFiles  L37939
uploadDraftPhoto  L39947
startSetCapture  L40025
rejectOnAllRefusal  L26585
performRejectStagedCoin  L26601
writeNewRowKeyCells  L11907
finishCoinDraftWrite  L26046
refreshAfterCoinRowWrite  L26082
coinDraftNotClosedText  L26095
saveFailureReason  L7276
saveLogHeadline  L7156
saveLogStepLines  L7160
saveLogText  L7164
copySaveLog  L7171
photoSaveFailureText  L31596
addSetGalleryPhotosToSave  L39989
uploadSetGalleryPhotos  L40001
uploadSetDraftFile  L39952
setStartFilesText  L40150
startSetCaptureUntimed  L40031
saveCurrentChildUntimed  L40356
plannedPromotionMoves  L15007
recordPromotedSetRecords  L15050
addCoinSaveLabel  L36783
draftNotSavedText  L32459
showToast  L16885
