# Code map: app.html, function -> line (generated)

`app.html` is 36,349 lines. Generated from `1c8a19c` (the code commit of `claude/addcoin-finish-required-and-draft-cleanup` after the F3 change; a later docs-only commit on that branch does not move any line) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5433  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L5948  STORED PHOTOS / RECEIPTS
L5950  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6311  LIVE NAV DATA
L7797  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L8396  BROWSE EDIT WRITE LAYER
L9127  COINID RE-LINKING ON IDENTITY EDIT
L9495  SET ATTACH / DETACH — A
L9698  PHOTOS / RECEIPTS TABLE WRITE LAYER
L10149  PURGE
L10508  CONTAINERS READ-LAYER JOIN
L10582  WRITE-LAYER GUARD DIALOGS
L10983  ADD COIN
L11287  ADD COIN PHASE 2
L11817  DOCKET RESEARCH QUEUE
L12191  FAKE DATA
L12475  PHOTO GALLERY & CROP PIPELINE
L13984  SECTION LOADING INDICATOR
L14020  SHARING
L14053  DASHBOARD
L17451  RECORD ACCORDIONS
L17900  BROWSE DETAIL — EDIT
L20233  ALBUMS
L21696  WISHLIST
L21862  NEEDS ATTENTION
L22632  STAGING REVIEW — P
L23625  STATS & VALUE
L23749  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24635  FORMER HOLDINGS
L25096  RECEIPT
L25329  COMMIT A CAPTURED RECEIPT
L26165  PHOTO CROP ADJUSTER
L26387  STAGE 1 — BACKGROUND CROP
L26671  CROP PIPELINE ORCHESTRATOR
L26750  COMMIT A CAPTURED PHOTO
L26933  STORED PHOTOS IN THE CAPTURE UI
L27020  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27627  PHOTOS WAIT FOR SAVE (O
L28034  CROP FROM AN UPLOADED PHOTO
L28541  GALLERY CAPTURE WIDGET
L28661  SUB-GROUP PHOTO SHEET
L28688  DRAFT MODE (A
L29013  ADD SET
L29164  ADD SET STEP 2
L29233  MANAGE PHOTOS
L29896  GALLERY DISPLAY
L29995  IN-APP MEDIA VIEWER
L30947  FILES PICKER + PHOTO GUARD (A
L30982  UNIFIED IMAGE CHOOSER (O
L31049  PHOTO SLOTS
L31176  ADD COIN
L31208  GRADE PICKER
L31277  DESCRIPTION AUTO-FILL
L31797  DESCRIPTION CONSISTENCY GATE (A
L31987  PCGS LABEL AUTO-POPULATE
L32592  DIRECT-WRITE
L32938  ADD COIN SAVE — P
L33460  EDITING AN EXISTING STAGING DRAFT (P
L33699  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L34549  YEAR PICKER
L35001  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7037
activeCoins  L7352
isExitStatus  L8518
ownedCoins  L8531
buildCoinDraft  L11049
coinDraftToAllValues  L11371
compositionLabelCandidates  L15449
setFittedCornerText  L15469
roundToCents  L19007
valueWithFaceFloor  L19049
refreshVarietyOptions  L31764
applyDbCoinsRowToForm  L32088
readAddCoinFormForDraft  L32817
refreshAddCoinCategoryUI  L13536
addCoinDirectSaveGaps  L32627
addCoinMatchResolved  L32660
addCoinGateMessage  L32649
saveCoinDraftEdit  L33146
resetAddCoinForm  L33327
applyCoinDraftToForm  L33524

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L9009
saveCoinRowToWorkbook  L9076
writeCoinIdCell  L9197
setDraftFolder  L10833
coinDraftFolder  L11018
setFlipPhotoUrl  L12778
readBrowseEditForm  L19268
checkDesignationReresolution  L20125
collectionIdNumber  L22649
renderStagingList  L22688
promoteStagedCoin  L23008
rejectStagedCoin  L23574
findDbCoinsMatch  L31432
isVarietyRecognized  L31791
renderAmbiguousMatchList  L32208
isConfidentMatch  L32633
coinDraftPromoteGaps  L11581
allRowHoldsCoinDraft  L11604
coinOnLoadedAllSheet  L11210
coinDraftStaleOnAll  L11222
markCoinDraftAlreadyPromoted  L23142
finishCoinDraftWrite  L23088

## Add Set

getWriteToken  L7837
reservationIdNumber  L10765
addChildToSetDraft  L10943
plannedPromotionMoves  L12109
matchDbSetsByProductCode  L35092
dbSetTypeName  L35110
composeSetName  L35126
categoryFromLineage  L35166
readAddSetYear  L35633
resumeSetDraftAtStep1  L35756
startSetCapture  L35890
allSubGroupsFull  L36002
renderChildStep  L36008
readChildFormValues  L36116
restoreChildFormValues  L36131
saveCurrentChild  L36179

## Albums

mapWorkbookRowToDbSet  L6827
buildLiveAlbums  L6966
activeDbCoins  L7354
activeAlbums  L7446
setBrowseStepContext  L15930
resolveCoinAlbumLink  L17289
renderAlbumsList  L20456
initAlbums  L20511
computeAlbumPageRows  L20620
openAlbumAtPage  L20779
showAlbumDetail  L20864
slotMintage  L20895
formatAlbumMintage  L20916
renderSlotCell  L21120
turnAlbumPage  L21426
renderAlbumBook  L21523

## All-sheet write layer (Browse Edit, new rows, Set link, dates)

refreshLiveCoinsAfterWrite  L7791
__setBrowseEditWriteEnabledForTest  L8628
excelSerialToday  L8679
workbookDateToday  L8718
localISODateToday  L8761
toWorkbookDate  L8768
__resetAllHeaderMapForTest  L8864
findAllSheetRowNumber  L8868
detectIdentityOverwrites  L8989
createAllSheetRow  L9406
writeOriginSetIdCell  L9573
writeRecordRow  L9859
resolveStorageLocation  L10562
showWriteGuard  L10589
promoteCoinDraftToAllSheetUnlocked  L11646
forceAddCoinDraft  L23244

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5818
getReferenceImageToken  L5861
fetchReferenceImageBlob  L5893
ensureReferenceImageFetch  L5924
__setSplashTimingsForTest  L6438
noteRetryAfter  L6468
abortStartupRequests  L6515
withRequestTimeout  L6522
refetchMissingLiveNavSheets  L7303
liveDataMode  L7419
saveDocketQueue  L11982
hasReferenceImage  L14271
applyRealReferenceImage  L14414

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7532
graph  L8354
loadDocketQueue  L11918
galleryFlipEntry  L12761
buildCertLookupUrl  L13030
spotlightCoinList  L14152
applyDiscContent  L14328
originSetIdKeysMatch  L16976
setChildrenFor  L16981
compositionTextFor  L17259
resolveChildParentSet  L17369
renderDetailAccordions  L17524
buildSetChildRow  L18193
catalogFunFactFor  L18767
formatCurrency  L19028
renderStats  L24383

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6603
buildLookupCategoryList  L7257
activeDbSets  L7353
coinMatchesSearchQuery  L15184
metalCategoryFor  L15356
coinsTabBaseRows  L16173
medalTabBaseRows  L16186
applyCoinsTabFilters  L16210
applySetsTabFilters  L16237
renderSetChecklist  L16261
rollYearNumber  L16318
applyRollsTabFilters  L16365
resetBrowseFilters  L16422
showBrowseTab  L16470
detailTitleText  L17103
ownedSetForSetId  L35244
applyAddSetContext  L35844

## CoinID matcher

activeLookupGraders  L7355
knownDbCoinsFinishValues  L19815
dbCoinsCandidatesFor  L19830
docketRecheckEntry  L22012
runWithButtonPending  L23044
promoteCoinDraft  L23197
recheckCoinDraftMatch  L23397
lookupDescriptionCandidates  L31339
normField  L31410
addCoinIdentityShape  L31449
currentAddCoinMatchState  L31508
checkDbCoinsMatch  L31534
resolveAddCoinCatalogMatch  L31646
parsePcgsLabel  L32017
updateSaveConfidenceUI  L32681
completeAddCoinSave  L32972

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7577
coinDetailsFor  L12407
setNavBack  L13727
navigate  L13789
initCabinet  L14080
updateDocketFob  L14113
resetSpotlightTimer  L15098
browseMetalTest  L15790
sortRollRows  L16331
rollsMetalTest  L16357
armLeaveGuard  L27389
mintMarkOtherSelected  L32361
selectMintMarkOther  L32365
buildSplashDiagnosticText  L34714
runSplashConnect  L34751
docketQueueReady  L34828

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8364
__resetWorkbookWebUrlCacheForTest  L8373
getCachedFolderWebUrl  L8383
flagCoinIdNeedsRelink  L10488
listSetDrafts  L10926
dismissSetDraftGap  L10975
buildDocketEntry  L12009
docketOpenEntries  L12042
appendDocketEntry  L12052
coinMissingPhoto  L15223
wireStaticAccordionToggle  L18916
performBrowseEditWrite  L19502
renderNeedsAttentionHub  L22162
appendDocketRows  L22531
buildCoinRecordFromForm  L32793

## Flip card and corner labels

mapWorkbookRowToCoin  L6637
wireSideToggle  L14390
renderCornerLines  L14433
wrapTextToTwoLines  L14456
renderFittedCornerLines  L14518
renderTypeDenomCorner  L14730
gradeDesignationCornerText  L14879
applyFlipCorners  L14892
cornerClearsDisc  L15573
shrinkCornerToFit  L15633
setCompositionCornerText  L15736
renderBrowseGrid  L15932
toggleBrowseDetailSide  L16918
showBrowseDetail  L17111
isSetRow  L17305
escapeHtmlText  L25136

## Former Holdings and Purge

formerHoldings  L8567
writePurgedCell  L9602
patchRecordRow  L9892
readRecordRows  L9930
buildPhotoRowPatch  L10110
clearPhotoRowField  L10127
purgeablePhotosFor  L10183
fileRowsForPhotos  L10224
finalisePurgedFlag  L10281
purgeCoinPhotos  L10320
activeYearFilterState  L16117
yearRowTestAgainst  L16125
updateActiveYearFilterButtonUI  L16150
applyAfterYearFilterChange  L16154
browseStepListFallback  L17009
renderFormerHoldings  L24753

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8589
setSelectValuePreservingUnknown  L18373
coinValueFigure  L19072
ensureSpotPricesForMeltLabels  L19127
loadSpotPrices  L23651
renderSpotPrices  L23708
refreshLedgerValueTiles  L24500

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10405
recordPromotedCoinRecords  L11519
seriesLabel  L14219
sanitizeSeriesName  L14250
referenceSeriesKey  L14254
showBrowseEditSetView  L18789
commitReceiptCapture  L25494
photoCommitTargetId  L26778
unsavedEditsForView  L27183
refreshEditSaveState  L27327
buildPhotoPairSlot  L28801
manageOpenEndedBlock  L29361
renderManagePhotos  L29540
renderManagePhotosInto  L29557
uploadCoinDraftPhotos  L32893
uploadDraftPhoto  L35883
