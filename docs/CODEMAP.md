# Code map: app.html, function -> line (generated)

`app.html` is 41,536 lines. Generated from Build 5's branch `claude/build5-promote-photo-save` (21 Nov 2026; before that `2fa5ae8`, Build 4 F-1) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5632  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L6161  STORED PHOTOS / RECEIPTS
L6163  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6574  LIVE NAV DATA
L7226  CONSISTENCY CHECK (B7, B
L10028  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L11092  BROWSE EDIT WRITE LAYER
L12329  COINID RE-LINKING ON IDENTITY EDIT
L12771  SET ATTACH / DETACH — A
L12986  PHOTOS / RECEIPTS TABLE WRITE LAYER
L13646  PURGE
L14013  CONTAINERS READ-LAYER JOIN
L14090  WRITE-LAYER GUARD DIALOGS
L14548  ADD COIN
L14852  ADD COIN PHASE 2
L15567  DOCKET RESEARCH QUEUE
L15945  FAKE DATA
L16229  PHOTO GALLERY & CROP PIPELINE
L17745  SECTION LOADING INDICATOR
L17781  SHARING
L17814  DASHBOARD
L21213  RECORD ACCORDIONS
L21662  BROWSE DETAIL — EDIT
L24026  ALBUMS
L25489  WISHLIST
L25655  NEEDS ATTENTION
L26466  STAGING REVIEW — P
L27529  STATS & VALUE
L27653  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L28543  FORMER HOLDINGS
L29004  RECEIPT
L29237  COMMIT A CAPTURED RECEIPT
L30090  PHOTO CROP ADJUSTER
L30542  STAGE 1 — BACKGROUND CROP
L31291  CROP PIPELINE ORCHESTRATOR
L31378  COMMIT A CAPTURED PHOTO
L31619  STORED PHOTOS IN THE CAPTURE UI
L31706  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L32316  PHOTOS WAIT FOR SAVE (O
L32764  CROP FROM AN UPLOADED PHOTO
L33272  GALLERY CAPTURE WIDGET
L33392  SUB-GROUP PHOTO SHEET
L33419  DRAFT MODE (A
L33750  ADD SET
L33901  ADD SET STEP 2
L33970  MANAGE PHOTOS
L34633  GALLERY DISPLAY
L34732  IN-APP MEDIA VIEWER
L35701  FILES PICKER + PHOTO GUARD (A
L35736  UNIFIED IMAGE CHOOSER (O
L35803  PHOTO SLOTS
L35930  ADD COIN
L35962  GRADE PICKER
L36031  DESCRIPTION AUTO-FILL
L36551  DESCRIPTION CONSISTENCY GATE (A
L36741  PCGS LABEL AUTO-POPULATE
L37353  DIRECT-WRITE
L37722  ADD COIN SAVE — P
L38362  EDITING AN EXISTING STAGING DRAFT (P
L38695  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L39576  YEAR PICKER
L40028  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L9136
activeCoins  L9511
isExitStatus  L11214
ownedCoins  L11227
buildCoinDraft  L14614
coinDraftToAllValues  L14936
compositionLabelCandidates  L19210
setFittedCornerText  L19230
roundToCents  L22777
valueWithFaceFloor  L22819
refreshVarietyOptions  L36518
applyDbCoinsRowToForm  L36842
readAddCoinFormForDraft  L37578
refreshAddCoinCategoryUI  L17290
addCoinDirectSaveGaps  L37388
addCoinMatchResolved  L37421
addCoinGateMessage  L37410
saveCoinDraftEdit  L38013
resetAddCoinForm  L38227
applyCoinDraftToForm  L38518

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L11821
saveCoinRowToWorkbook  L12209
writeCoinIdCell  L12399
setDraftFolder  L14395
coinDraftFolder  L14583
setFlipPhotoUrl  L16532
readBrowseEditForm  L23038
checkDesignationReresolution  L23918
collectionIdNumber  L26483
renderStagingList  L26522
promoteStagedCoin  L26842
rejectStagedCoin  L27454
findDbCoinsMatch  L36186
isVarietyRecognized  L36545
renderAmbiguousMatchList  L36969
isConfidentMatch  L37394
coinDraftPromoteGaps  L15295
allRowHoldsCoinDraft  L15318
coinOnLoadedAllSheet  L14775
coinDraftStaleOnAll  L14787
markCoinDraftAlreadyPromoted  L27006
finishCoinDraftWrite  L26922

## Add Set

getWriteToken  L10068
reservationIdNumber  L14280
addChildToSetDraft  L14508
plannedPromotionMoves  L15859
matchDbSetsByProductCode  L40119
dbSetTypeName  L40137
composeSetName  L40153
categoryFromLineage  L40193
readAddSetYear  L40667
resumeSetDraftAtStep1  L40791
startSetCapture  L41002
allSubGroupsFull  L41153
renderChildStep  L41159
readChildFormValues  L41267
restoreChildFormValues  L41282
saveCurrentChild  L41330

## Albums

mapWorkbookRowToDbSet  L8926
buildLiveAlbums  L9065
activeDbCoins  L9513
activeAlbums  L9629
setBrowseStepContext  L19692
resolveCoinAlbumLink  L21051
renderAlbumsList  L24249
initAlbums  L24304
computeAlbumPageRows  L24413
openAlbumAtPage  L24572
showAlbumDetail  L24657
slotMintage  L24688
formatAlbumMintage  L24709
renderSlotCell  L24913
turnAlbumPage  L25219
renderAlbumBook  L25316

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L11576
ensureAllHeaderMap  L11594
ensureSheetHeaderMap  L13062
missingWriteColumns  L11612
assertNoFormulaCells  L11644
readAllRowForWrite  L11729
batchWriteError  L11533
partialSaveResult  L11898

refreshLiveCoinsAfterWrite  L10022
__setBrowseEditWriteEnabledForTest  L11324
excelSerialToday  L11375
workbookDateToday  L11414
localISODateToday  L11457
toWorkbookDate  L11464
__resetAllHeaderMapForTest  L11655
findAllSheetRowNumber  L11659
detectIdentityOverwrites  L11801
createAllSheetRow  L12655
writeOriginSetIdCell  L12849
writeRecordRow  L13157
resolveStorageLocation  L14070
showWriteGuard  L14097
promoteCoinDraftToAllSheetUnlocked  L15364
forceAddCoinDraft  L27119

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L6020
getReferenceImageToken  L6074
fetchReferenceImageBlob  L6106
ensureReferenceImageFetch  L6137
__setSplashTimingsForTest  L6701
noteRetryAfter  L6731
abortStartupRequests  L6778
withRequestTimeout  L6785
refetchMissingLiveNavSheets  L9460
liveDataMode  L9602
saveDocketQueue  L15732
hasReferenceImage  L18032
applyRealReferenceImage  L18175

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L9715
graph  L11050
loadDocketQueue  L15668
galleryFlipEntry  L16515
buildCertLookupUrl  L16784
spotlightCoinList  L17913
applyDiscContent  L18089
originSetIdKeysMatch  L20738
setChildrenFor  L20743
compositionTextFor  L21021
resolveChildParentSet  L21131
renderDetailAccordions  L21286
buildSetChildRow  L21955
catalogFunFactFor  L22537
formatCurrency  L22798
renderStats  L28291

## Catalog, Sets tab, Rolls, live-nav data

colVal  L8702
buildLookupCategoryList  L9412
activeDbSets  L9512
coinMatchesSearchQuery  L18945
metalCategoryFor  L19117
coinsTabBaseRows  L19935
medalTabBaseRows  L19948
applyCoinsTabFilters  L19972
applySetsTabFilters  L19999
renderSetChecklist  L20023
rollYearNumber  L20080
applyRollsTabFilters  L20127
resetBrowseFilters  L20184
showBrowseTab  L20232
detailTitleText  L20865
ownedSetForSetId  L40271
applyAddSetContext  L40879

## CoinID matcher

activeLookupGraders  L9514
knownDbCoinsFinishValues  L23608
dbCoinsCandidatesFor  L23623
docketRecheckEntry  L25809
runWithButtonPending  L26878
promoteCoinDraft  L27071
recheckCoinDraftMatch  L27273
lookupDescriptionCandidates  L36093
normField  L36164
addCoinIdentityShape  L36203
currentAddCoinMatchState  L36262
checkDbCoinsMatch  L36288
resolveAddCoinCatalogMatch  L36400
parsePcgsLabel  L36771
updateSaveConfidenceUI  L37442
completeAddCoinSave  L37767

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L9760
coinDetailsFor  L16161
setNavBack  L17481
navigate  L17543
initCabinet  L17841
updateDocketFob  L17874
resetSpotlightTimer  L18859
browseMetalTest  L19551
sortRollRows  L20093
rollsMetalTest  L20119
armLeaveGuard  L32078
mintMarkOtherSelected  L37122
selectMintMarkOther  L37126
buildSplashDiagnosticText  L39741
runSplashConnect  L39778
docketQueueReady  L39855

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L11060
__resetWorkbookWebUrlCacheForTest  L11069
getCachedFolderWebUrl  L11079
flagCoinIdNeedsRelink  L13993
listSetDrafts  L14491
dismissSetDraftGap  L14540
buildDocketEntry  L15759
docketOpenEntries  L15792
appendDocketEntry  L15802
coinMissingPhoto  L18984
wireStaticAccordionToggle  L22686
performBrowseEditWrite  L23276
renderNeedsAttentionHub  L25959
appendDocketRows  L26363
buildCoinRecordFromForm  L37554

## Flip card and corner labels

mapWorkbookRowToCoin  L8736
wireSideToggle  L18151
renderCornerLines  L18194
wrapTextToTwoLines  L18217
renderFittedCornerLines  L18279
renderTypeDenomCorner  L18491
gradeDesignationCornerText  L18640
applyFlipCorners  L18653
cornerClearsDisc  L19334
shrinkCornerToFit  L19394
setCompositionCornerText  L19497
renderBrowseGrid  L19694
toggleBrowseDetailSide  L20680
showBrowseDetail  L20873
isSetRow  L21067
escapeHtmlText  L29044

## Former Holdings and Purge

formerHoldings  L11263
writePurgedCell  L12882
patchRecordRow  L13210
readRecordRows  L13261
buildPhotoRowPatch  L13599
clearPhotoRowField  L13617
purgeablePhotosFor  L13680
fileRowsForPhotos  L13721
finalisePurgedFlag  L13779
purgeCoinPhotos  L13821
activeYearFilterState  L19879
yearRowTestAgainst  L19887
updateActiveYearFilterButtonUI  L19912
applyAfterYearFilterChange  L19916
browseStepListFallback  L20771
renderFormerHoldings  L28661

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L11285
setSelectValuePreservingUnknown  L22135
coinValueFigure  L22842
ensureSpotPricesForMeltLabels  L22897
loadSpotPrices  L27555
renderSpotPrices  L27612
refreshLedgerValueTiles  L28408

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L13907
recordPromotedCoinRecords  L15226
seriesLabel  L17980
sanitizeSeriesName  L18011
referenceSeriesKey  L18015
showBrowseEditSetView  L22559
commitReceiptCapture  L29407
photoCommitTargetId  L31406
unsavedEditsForView  L31869
refreshEditSaveState  L32016
buildPhotoPairSlot  L33538
manageOpenEndedBlock  L34098
renderManagePhotos  L34277
renderManagePhotosInto  L34294
uploadCoinDraftPhotos  L37663
uploadDraftPhoto  L40924

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9919
checkSessionAgainstWorkbook  L8059
checkWorkbookVersion  L7041
deleteWorkbookCacheForWrite  L8429
fetchWorkbookSheetRows  L6811
fetchWorkbookVersion  L6995
finishCoinRowSave  L12187
fullReadVersionTrusted  L8131
gatedGraphClient  L7953
hashSheetValues  L8139
idbOpenCache  L8356
isMsalNetworkError  L8267
launchFromSavedCopy  L8519
loadWorkbookCacheRecord  L8483
noteFullReadReport  L6941
noteRecentRowWrite  L11946
noteSaveOutcome  L12039
onFullReadLanded  L8151
recordWorkbookVersionCheck  L7025
refreshSessionFromWorkbook  L8106
renderDocketDataLine  L8591
renderLagProbe  L8674
renderLoadReport  L7098
renderSessionState  L8222
rowsFromSheetValues  L6874
saveWorkbookCacheAfterRead  L8436
setConnectionTrouble  L8032
settleSavedCopyVersion  L8547
startLagProbe  L8642
tokenFailureAction  L8277
whenWritesAllowed  L8190
withRecentWrites  L11957
withSaveTiming  L7787
workbookSessionChecked  L7865
workbookWritesAllowed  L7869

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L9527
addCoinCatalogFinish  L37402
applyCoinDraftToForm  L38518
applyDbCoinsRowToForm  L36842
applyLiveNavOptionalRows  L9340
buildLookupFinishList  L9390
catalogFinishGroupKey  L19591
populateFinishOptions  L9534
refetchMissingLiveNavSheets  L9460
resetAddCoinForm  L38227
setSelectValuePreservingUnknown  L22135

## Save speed and writes while Excel lags ((ax) Stage 1 + 2a, merged 7 Nov 2026)

allHeaderMapWidth  L12073
allRowForWriteFromDetail  L11742
claimedRows  L12582
createAllSheetRow  L12655
idbCacheDelete  L8399
keysNotVisibleError  L12600
keysNotVisibleRows  L12595
markCoinDraftAlreadyPromoted  L27006
markCoinDraftAlreadyPromotedUntimed  L27015
noteClaimedRow  L12586
noteOwnRowState  L12009
ownCellsMatch  L11991
ownStateIndex  L12024
readAllRowForSave  L12090
readAllRowForWrite  L11729
readBackLastModified  L12142
rowClaimedThisSession  L12587
rowGuessProblem  L12077
saveCoinRowToWorkbook  L12209
savedCopyDeleteStepName  L8009
serialToClockWithSeconds  L12133
startSaveWatch  L7714
stopSaveWatch  L7743
withLatestOwnState  L12029
writeRecordRow  L13157

## Workbook session ((bk), merged 8 Nov 2026)

createExcelSession  L10175
dropExcelSession  L10146
excelSessionIdForRequest  L10157
excelSessionRejection  L10262
excelSessionsApply  L10145
excelWorkbookFetch  L10282
noteExcelSessionEvent  L10132
postCreateSession  L10165
prepareExcelSessionForStep  L10230
promoteCoinDraftToAllSheetInStep  L15372
runWorkbookStep  L7921
sessionChangedError  L10272
startExcelSessionAfterLaunch  L10252
writeRecordRowInStep  L13160

## Full-resolution photos ((ak), merged 11 Nov 2026)

RealGraphClient.putContentInSession is an object method (no line entry): look for `async putContentInSession(` inside `const RealGraphClient = {`.

__getLastBgCropResultForTest  L30637
bakeBgCropFromOriginal  L30812
bgCropUntouched  L30795
blobIsJpeg  L30604
canvasToBlob  L30632
commitGalleryPhoto  L31422
decodeFullResOriented  L30613
describeGraphCall  L7804
draftRecropSource  L33520
ensureCoinPhotoThumb  L6373
ensureStoredThumbs  L32626
fetchCoinPhotoThumbBlob  L6357
galleryTypeTrimOnly  L31309
initBgCrop  L31032
initPhotoAdjuster  L30432
loadCropSourceBlob  L32806
openBgCrop  L30754
openPhotoAdjust  L30165
paintStoredThumbWhenReady  L34658
refreshBgCropSource  L30726
resetBgCropBox  L30742
runCropPipeline  L31310
showEntryInMediaViewer  L35087
showMediaViewerAt  L34986
smallCopyOf  L30624
storedTileFetch  L6390
uploadSizeText  L10338

## Crop-screen basics ((bs) Build 3, merged 14 Nov 2026)

roundCropAngle  L30120
snapCropAngle  L30137
steppedCropAngle  L30131
steppedCropZoom  L30144
cropAngleText  L30126
blockCropLongPress  L30150
bgCropFitBounds  L30672
layoutBgCropStage  L30692
bgCropHandOffRect  L30853
nudgeBgCropBox  L31004
renderBgCrop  L30954
clampBgBox  L31024
bgCropViewSize  L30869
clampBgCropPan  L30870
resetBgCropView  L30875
rememberBgCropViewCentre  L30881
setBgCropView  L30890
bgCropHandlePoint  L30912
bgCropZoomStep  L30918
showBgCropRect  L30930
photoAdjustZoomToPos  L30278
photoAdjustPosToZoom  L30282
syncPhotoAdjustZoomSlider  L30285
placePhotoAdjustZoomTick  L30293
setPhotoAdjustZoom  L30304
clampPhotoAdjustOffsets  L30326
quickRotatePhotoAdjust  L30352
photoAdjustOutputSize  L30369
bakePhotoAdjustFromSource  L30379
bakePhotoAdjustFromOriginal  L30405
__getLastPhotoAdjustResultForTest  L30374
startCropFromUpload  L32875
showWriteGuard  L14097

## Data safety part 1 (review Build 3: A1, A12, A2, A16, A4, B1, and the TEST round's B-1, F-1 to F-6; branch `claude/build3-data-safety`, 15-16 Nov 2026)

stagingFolderIdNumber  L14329
readMaxReservedIdFromStaging  L14332
newDraftToken  L14352
draftIdInUseError  L14357
writeNewDraftJson  L14362
uploadCoinDraftPhotos  L37663
uploadCoinDraftReceipt  L37704
completeAddCoinSaveUntimed  L37770
enterFirstSaveRetry  L38402
firstSavePhotoOrder  L38459
saveCoinDraftEdit  L38013
uploadStagingEditFiles  L38916
uploadDraftPhoto  L40924
startSetCapture  L41002
rejectOnAllRefusal  L27472
performRejectStagedCoin  L27488
writeNewRowKeyCells  L12443
finishCoinDraftWrite  L26922
refreshAfterCoinRowWrite  L26967
coinDraftNotClosedText  L26980
saveFailureReason  L7768
saveLogHeadline  L7191
saveLogStepLines  L7195
saveLogText  L7199
copySaveLog  L7206
photoSaveFailureText  L32573
addSetGalleryPhotosToSave  L40966
uploadSetGalleryPhotos  L40978
uploadSetDraftFile  L40929
setStartFilesText  L41127
startSetCaptureUntimed  L41008
saveCurrentChildUntimed  L41333
plannedPromotionMoves  L15859
recordPromotedSetRecords  L15895
addCoinSaveLabel  L37760
draftNotSavedText  L33436
showToast  L17733

## Consistency check (review Build 4: B7 + A19; branch `claude/build4-consistency-check`, 16 Nov 2026)

consistencyReadClient  L7254
consistencyReadTableRows  L7286
gatherConsistencyData  L7311
compareConsistency  L7364
consistencySectionCount  L7574
consistencyResultLines  L7581
consistencyResultText  L7610
renderConsistencyCheck  L7614
runConsistencyCheck  L7633
copyConsistencyResult  L7671

## Promote / photo save (review Build 5: A5, B3, A3, B4, A18, A14, N1, (bv); branch `claude/build5-promote-photo-save`, 21 Nov 2026)
Write-up: docs/ref/ADD_COIN_WRITE.md "Build 5 of the November 2026 review".
mintRecordIdFromColumn  L13095
claimRecordRow  L13179
patchRecordRow  L13210
writePhotoRow  L13314
writePhotoRowsBatch  L13335
withPhotoSaveScope  L13364
readPhotosTableForWrite  L13369
checkPhotoRowAt  L13404
notePhotoRowInRead  L13414
writeOnePhotoRow  L13429
writePhotoLabelInStep  L13522
detachPhotoRowWhere  L13557
moveFileWithoutOverwrite  L15066
syncSkipLookSwitch  L15055
runPromotionFilesOnce  L15124
finishPromotionFiles  L15138
movePromotedCoinFiles  L15167
movePromotedSetFiles  L15882
recordPhotoRowsInto  L15200
promotionUnfinishedRowText  L15172
promotionUnfinishedText  L15180
coinPromotionUnfinished  L15282
setPromotionUnfinished  L15285
finishCoinDraftWrite  L26922
markCoinDraftAlreadyPromotedUntimedInStep  L27018
uploadGalleryPhotoFiles  L31440
coinPhotoAdoptable  L31429
writeGalleryPhotoRow  L31534
galleryPhotoRowItem  L31546
noteGalleryPhotoRowWritten  L31553
savePendingPhotos  L32447
savePhotosAndLabels  L32532
commitReceiptCaptureInStep  L29410
