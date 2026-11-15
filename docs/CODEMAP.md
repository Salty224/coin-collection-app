# Code map: app.html, function -> line (generated)

`app.html` is 40,423 lines. Generated from `2fb62fd` (Build 3's code commit on `claude/build3-data-safety`, 15 Nov 2026; not merged yet) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L13842  ADD COIN
L14146  ADD COIN PHASE 2
L14712  DOCKET RESEARCH QUEUE
L15086  FAKE DATA
L15370  PHOTO GALLERY & CROP PIPELINE
L16882  SECTION LOADING INDICATOR
L16918  SHARING
L16951  DASHBOARD
L20350  RECORD ACCORDIONS
L20799  BROWSE DETAIL — EDIT
L23163  ALBUMS
L24626  WISHLIST
L24792  NEEDS ATTENTION
L25575  STAGING REVIEW — P
L26627  STATS & VALUE
L26751  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L27641  FORMER HOLDINGS
L28102  RECEIPT
L28335  COMMIT A CAPTURED RECEIPT
L29183  PHOTO CROP ADJUSTER
L29635  STAGE 1 — BACKGROUND CROP
L30384  CROP PIPELINE ORCHESTRATOR
L30471  COMMIT A CAPTURED PHOTO
L30660  STORED PHOTOS IN THE CAPTURE UI
L30747  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L31357  PHOTOS WAIT FOR SAVE (O
L31772  CROP FROM AN UPLOADED PHOTO
L32280  GALLERY CAPTURE WIDGET
L32400  SUB-GROUP PHOTO SHEET
L32427  DRAFT MODE (A
L32752  ADD SET
L32903  ADD SET STEP 2
L32972  MANAGE PHOTOS
L33635  GALLERY DISPLAY
L33734  IN-APP MEDIA VIEWER
L34703  FILES PICKER + PHOTO GUARD (A
L34738  UNIFIED IMAGE CHOOSER (O
L34805  PHOTO SLOTS
L34932  ADD COIN
L34964  GRADE PICKER
L35033  DESCRIPTION AUTO-FILL
L35553  DESCRIPTION CONSISTENCY GATE (A
L35743  PCGS LABEL AUTO-POPULATE
L36355  DIRECT-WRITE
L36724  ADD COIN SAVE — P
L37339  EDITING AN EXISTING STAGING DRAFT (P
L37672  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L38553  YEAR PICKER
L39005  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8644
activeCoins  L9019
isExitStatus  L10680
ownedCoins  L10693
buildCoinDraft  L13908
coinDraftToAllValues  L14230
compositionLabelCandidates  L18347
setFittedCornerText  L18367
roundToCents  L21914
valueWithFaceFloor  L21956
refreshVarietyOptions  L35520
applyDbCoinsRowToForm  L35844
readAddCoinFormForDraft  L36580
refreshAddCoinCategoryUI  L16431
addCoinDirectSaveGaps  L36390
addCoinMatchResolved  L36423
addCoinGateMessage  L36412
saveCoinDraftEdit  L36994
resetAddCoinForm  L37204
applyCoinDraftToForm  L37495

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11287
saveCoinRowToWorkbook  L11673
writeCoinIdCell  L11863
setDraftFolder  L13692
coinDraftFolder  L13877
setFlipPhotoUrl  L15673
readBrowseEditForm  L22175
checkDesignationReresolution  L23055
collectionIdNumber  L25592
renderStagingList  L25631
promoteStagedCoin  L25951
rejectStagedCoin  L26552
findDbCoinsMatch  L35188
isVarietyRecognized  L35547
renderAmbiguousMatchList  L35971
isConfidentMatch  L36396
coinDraftPromoteGaps  L14440
allRowHoldsCoinDraft  L14463
coinOnLoadedAllSheet  L14069
coinDraftStaleOnAll  L14081
markCoinDraftAlreadyPromoted  L26106
finishCoinDraftWrite  L26031

## Add Set

getWriteToken  L9576
reservationIdNumber  L13577
addChildToSetDraft  L13802
plannedPromotionMoves  L15004
matchDbSetsByProductCode  L39096
dbSetTypeName  L39114
composeSetName  L39130
categoryFromLineage  L39170
readAddSetYear  L39637
resumeSetDraftAtStep1  L39761
startSetCapture  L39920
allSubGroupsFull  L40053
renderChildStep  L40059
readChildFormValues  L40167
restoreChildFormValues  L40182
saveCurrentChild  L40230

## Albums

mapWorkbookRowToDbSet  L8434
buildLiveAlbums  L8573
activeDbCoins  L9021
activeAlbums  L9137
setBrowseStepContext  L18829
resolveCoinAlbumLink  L20188
renderAlbumsList  L23386
initAlbums  L23441
computeAlbumPageRows  L23550
openAlbumAtPage  L23709
showAlbumDetail  L23794
slotMintage  L23825
formatAlbumMintage  L23846
renderSlotCell  L24050
turnAlbumPage  L24356
renderAlbumBook  L24453

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
promoteCoinDraftToAllSheetUnlocked  L14509
forceAddCoinDraft  L26219

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
saveDocketQueue  L14877
hasReferenceImage  L17169
applyRealReferenceImage  L17312

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9223
graph  L10516
loadDocketQueue  L14813
galleryFlipEntry  L15656
buildCertLookupUrl  L15925
spotlightCoinList  L17050
applyDiscContent  L17226
originSetIdKeysMatch  L19875
setChildrenFor  L19880
compositionTextFor  L20158
resolveChildParentSet  L20268
renderDetailAccordions  L20423
buildSetChildRow  L21092
catalogFunFactFor  L21674
formatCurrency  L21935
renderStats  L27389

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8210
buildLookupCategoryList  L8920
activeDbSets  L9020
coinMatchesSearchQuery  L18082
metalCategoryFor  L18254
coinsTabBaseRows  L19072
medalTabBaseRows  L19085
applyCoinsTabFilters  L19109
applySetsTabFilters  L19136
renderSetChecklist  L19160
rollYearNumber  L19217
applyRollsTabFilters  L19264
resetBrowseFilters  L19321
showBrowseTab  L19369
detailTitleText  L20002
ownedSetForSetId  L39248
applyAddSetContext  L39849

## CoinID matcher

activeLookupGraders  L9022
knownDbCoinsFinishValues  L22745
dbCoinsCandidatesFor  L22760
docketRecheckEntry  L24946
runWithButtonPending  L25987
promoteCoinDraft  L26173
recheckCoinDraftMatch  L26371
lookupDescriptionCandidates  L35095
normField  L35166
addCoinIdentityShape  L35205
currentAddCoinMatchState  L35264
checkDbCoinsMatch  L35290
resolveAddCoinCatalogMatch  L35402
parsePcgsLabel  L35773
updateSaveConfidenceUI  L36444
completeAddCoinSave  L36759

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9268
coinDetailsFor  L15302
setNavBack  L16622
navigate  L16684
initCabinet  L16978
updateDocketFob  L17011
resetSpotlightTimer  L17996
browseMetalTest  L18688
sortRollRows  L19230
rollsMetalTest  L19256
armLeaveGuard  L31119
mintMarkOtherSelected  L36124
selectMintMarkOther  L36128
buildSplashDiagnosticText  L38718
runSplashConnect  L38755
docketQueueReady  L38832

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L10526
__resetWorkbookWebUrlCacheForTest  L10535
getCachedFolderWebUrl  L10545
flagCoinIdNeedsRelink  L13290
listSetDrafts  L13785
dismissSetDraftGap  L13834
buildDocketEntry  L14904
docketOpenEntries  L14937
appendDocketEntry  L14947
coinMissingPhoto  L18121
wireStaticAccordionToggle  L21823
performBrowseEditWrite  L22413
renderNeedsAttentionHub  L25096
appendDocketRows  L25474
buildCoinRecordFromForm  L36556

## Flip card and corner labels

mapWorkbookRowToCoin  L8244
wireSideToggle  L17288
renderCornerLines  L17331
wrapTextToTwoLines  L17354
renderFittedCornerLines  L17416
renderTypeDenomCorner  L17628
gradeDesignationCornerText  L17777
applyFlipCorners  L17790
cornerClearsDisc  L18471
shrinkCornerToFit  L18531
setCompositionCornerText  L18634
renderBrowseGrid  L18831
toggleBrowseDetailSide  L19817
showBrowseDetail  L20010
isSetRow  L20204
escapeHtmlText  L28142

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
activeYearFilterState  L19016
yearRowTestAgainst  L19024
updateActiveYearFilterButtonUI  L19049
applyAfterYearFilterChange  L19053
browseStepListFallback  L19908
renderFormerHoldings  L27759

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L10751
setSelectValuePreservingUnknown  L21272
coinValueFigure  L21979
ensureSpotPricesForMeltLabels  L22034
loadSpotPrices  L26653
renderSpotPrices  L26710
refreshLedgerValueTiles  L27506

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13204
recordPromotedCoinRecords  L14378
seriesLabel  L17117
sanitizeSeriesName  L17148
referenceSeriesKey  L17152
showBrowseEditSetView  L21696
commitReceiptCapture  L28505
photoCommitTargetId  L30499
unsavedEditsForView  L30910
refreshEditSaveState  L31057
buildPhotoPairSlot  L32540
manageOpenEndedBlock  L33100
renderManagePhotos  L33279
renderManagePhotosInto  L33296
uploadCoinDraftPhotos  L36665
uploadDraftPhoto  L39894

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
addCoinCatalogFinish  L36404
applyCoinDraftToForm  L37495
applyDbCoinsRowToForm  L35844
applyLiveNavOptionalRows  L8848
buildLookupFinishList  L8898
catalogFinishGroupKey  L18728
populateFinishOptions  L9042
refetchMissingLiveNavSheets  L8968
resetAddCoinForm  L37204
setSelectValuePreservingUnknown  L21272

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L11537
allRowForWriteFromDetail  L11208
claimedRows  L12046
createAllSheetRow  L12119
idbCacheDelete  L7907
keysNotVisibleError  L12064
keysNotVisibleRows  L12059
markCoinDraftAlreadyPromoted  L26106
markCoinDraftAlreadyPromotedUntimed  L26115
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
promoteCoinDraftToAllSheetInStep  L14517
runWorkbookStep  L7429
sessionChangedError  L9780
startExcelSessionAfterLaunch  L9760
writeRecordRowInStep  L12619

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L29730
bakeBgCropFromOriginal  L29905
bgCropUntouched  L29888
blobIsJpeg  L29697
canvasToBlob  L29725
commitGalleryPhoto  L30515
decodeFullResOriented  L29706
describeGraphCall  L7312
draftRecropSource  L32522
ensureCoinPhotoThumb  L6338
ensureStoredThumbs  L31634
fetchCoinPhotoThumbBlob  L6322
galleryTypeTrimOnly  L30402
initBgCrop  L30125
initPhotoAdjuster  L29525
loadCropSourceBlob  L31814
openBgCrop  L29847
openPhotoAdjust  L29258
paintStoredThumbWhenReady  L33660
refreshBgCropSource  L29819
resetBgCropBox  L29835
runCropPipeline  L30403
showEntryInMediaViewer  L34089
showMediaViewerAt  L33988
smallCopyOf  L29717
storedTileFetch  L6355
uploadSizeText  L9846

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L29213
snapCropAngle  L29230
steppedCropAngle  L29224
steppedCropZoom  L29237
cropAngleText  L29219
blockCropLongPress  L29243
bgCropFitBounds  L29765
layoutBgCropStage  L29785
bgCropHandOffRect  L29946
nudgeBgCropBox  L30097
renderBgCrop  L30047
clampBgBox  L30117
bgCropViewSize  L29962
clampBgCropPan  L29963
resetBgCropView  L29968
rememberBgCropViewCentre  L29974
setBgCropView  L29983
bgCropHandlePoint  L30005
bgCropZoomStep  L30011
showBgCropRect  L30023
photoAdjustZoomToPos  L29371
photoAdjustPosToZoom  L29375
syncPhotoAdjustZoomSlider  L29378
placePhotoAdjustZoomTick  L29386
setPhotoAdjustZoom  L29397
clampPhotoAdjustOffsets  L29419
quickRotatePhotoAdjust  L29445
photoAdjustOutputSize  L29462
bakePhotoAdjustFromSource  L29472
bakePhotoAdjustFromOriginal  L29498
__getLastPhotoAdjustResultForTest  L29467
startCropFromUpload  L31883
showWriteGuard  L13394

## Data safety part 1 (review Build 3: A1, A12, A2, A16, A4, B1; branch `claude/build3-data-safety`, 15 Nov 2026)

stagingFolderIdNumber  L13626
readMaxReservedIdFromStaging  L13629
newDraftToken  L13649
draftIdInUseError  L13654
writeNewDraftJson  L13659
uploadCoinDraftPhotos  L36665
uploadCoinDraftReceipt  L36706
completeAddCoinSaveUntimed  L36763
enterFirstSaveRetry  L37379
firstSavePhotoOrder  L37436
saveCoinDraftEdit  L36994
uploadStagingEditFiles  L37893
uploadDraftPhoto  L39894
startSetCapture  L39920
rejectOnAllRefusal  L26570
performRejectStagedCoin  L26586
writeNewRowKeyCells  L11907
finishCoinDraftWrite  L26031
refreshAfterCoinRowWrite  L26067
coinDraftNotClosedText  L26080
saveFailureReason  L7276
saveLogHeadline  L7156
saveLogStepLines  L7160
saveLogText  L7164
copySaveLog  L7171
photoSaveFailureText  L31581
