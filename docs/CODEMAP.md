# Code map: app.html, function -> line (generated)

`app.html` is 36,635 lines. Generated from `9033fa5` (main after the fast-forward merge of `claude/write-safety-al`, 6 Nov 2026; `app.html` is identical to its last code commit `b0e02d6` and to the docs commits after it) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L7800  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L8447  BROWSE EDIT WRITE LAYER
L9346  COINID RE-LINKING ON IDENTITY EDIT
L9727  SET ATTACH / DETACH — A
L9938  PHOTOS / RECEIPTS TABLE WRITE LAYER
L10396  PURGE
L10755  CONTAINERS READ-LAYER JOIN
L10832  WRITE-LAYER GUARD DIALOGS
L11233  ADD COIN
L11537  ADD COIN PHASE 2
L12090  DOCKET RESEARCH QUEUE
L12464  FAKE DATA
L12748  PHOTO GALLERY & CROP PIPELINE
L14257  SECTION LOADING INDICATOR
L14293  SHARING
L14326  DASHBOARD
L17724  RECORD ACCORDIONS
L18173  BROWSE DETAIL — EDIT
L20510  ALBUMS
L21973  WISHLIST
L22139  NEEDS ATTENTION
L22918  STAGING REVIEW — P
L23911  STATS & VALUE
L24035  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24921  FORMER HOLDINGS
L25382  RECEIPT
L25615  COMMIT A CAPTURED RECEIPT
L26451  PHOTO CROP ADJUSTER
L26673  STAGE 1 — BACKGROUND CROP
L26957  CROP PIPELINE ORCHESTRATOR
L27036  COMMIT A CAPTURED PHOTO
L27219  STORED PHOTOS IN THE CAPTURE UI
L27306  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27913  PHOTOS WAIT FOR SAVE (O
L28320  CROP FROM AN UPLOADED PHOTO
L28827  GALLERY CAPTURE WIDGET
L28947  SUB-GROUP PHOTO SHEET
L28974  DRAFT MODE (A
L29299  ADD SET
L29450  ADD SET STEP 2
L29519  MANAGE PHOTOS
L30182  GALLERY DISPLAY
L30281  IN-APP MEDIA VIEWER
L31233  FILES PICKER + PHOTO GUARD (A
L31268  UNIFIED IMAGE CHOOSER (O
L31335  PHOTO SLOTS
L31462  ADD COIN
L31494  GRADE PICKER
L31563  DESCRIPTION AUTO-FILL
L32083  DESCRIPTION CONSISTENCY GATE (A
L32273  PCGS LABEL AUTO-POPULATE
L32878  DIRECT-WRITE
L33224  ADD COIN SAVE — P
L33746  EDITING AN EXISTING STAGING DRAFT (P
L33985  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L34835  YEAR PICKER
L35287  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7037
activeCoins  L7355
isExitStatus  L8569
ownedCoins  L8582
buildCoinDraft  L11299
coinDraftToAllValues  L11621
compositionLabelCandidates  L15722
setFittedCornerText  L15742
roundToCents  L19280
valueWithFaceFloor  L19322
refreshVarietyOptions  L32050
applyDbCoinsRowToForm  L32374
readAddCoinFormForDraft  L33103
refreshAddCoinCategoryUI  L13809
addCoinDirectSaveGaps  L32913
addCoinMatchResolved  L32946
addCoinGateMessage  L32935
saveCoinDraftEdit  L33432
resetAddCoinForm  L33613
applyCoinDraftToForm  L33810

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L9164
saveCoinRowToWorkbook  L9276
writeCoinIdCell  L9416
setDraftFolder  L11083
coinDraftFolder  L11268
setFlipPhotoUrl  L13051
readBrowseEditForm  L19541
checkDesignationReresolution  L20402
collectionIdNumber  L22935
renderStagingList  L22974
promoteStagedCoin  L23294
rejectStagedCoin  L23860
findDbCoinsMatch  L31718
isVarietyRecognized  L32077
renderAmbiguousMatchList  L32494
isConfidentMatch  L32919
coinDraftPromoteGaps  L11831
allRowHoldsCoinDraft  L11854
coinOnLoadedAllSheet  L11460
coinDraftStaleOnAll  L11472
markCoinDraftAlreadyPromoted  L23428
finishCoinDraftWrite  L23374

## Add Set

getWriteToken  L7840
reservationIdNumber  L11015
addChildToSetDraft  L11193
plannedPromotionMoves  L12382
matchDbSetsByProductCode  L35378
dbSetTypeName  L35396
composeSetName  L35412
categoryFromLineage  L35452
readAddSetYear  L35919
resumeSetDraftAtStep1  L36042
startSetCapture  L36176
allSubGroupsFull  L36288
renderChildStep  L36294
readChildFormValues  L36402
restoreChildFormValues  L36417
saveCurrentChild  L36465

## Albums

mapWorkbookRowToDbSet  L6827
buildLiveAlbums  L6966
activeDbCoins  L7357
activeAlbums  L7449
setBrowseStepContext  L16203
resolveCoinAlbumLink  L17562
renderAlbumsList  L20733
initAlbums  L20788
computeAlbumPageRows  L20897
openAlbumAtPage  L21056
showAlbumDetail  L21141
slotMintage  L21172
formatAlbumMintage  L21193
renderSlotCell  L21397
turnAlbumPage  L21703
renderAlbumBook  L21800

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L8931
ensureAllHeaderMap  L8949
ensureSheetHeaderMap  L10014
missingWriteColumns  L8967
assertNoFormulaCells  L8999
readAllRowForWrite  L9082
batchWriteError  L8888
partialSaveResult  L9241

refreshLiveCoinsAfterWrite  L7794
__setBrowseEditWriteEnabledForTest  L8679
excelSerialToday  L8730
workbookDateToday  L8769
localISODateToday  L8812
toWorkbookDate  L8819
__resetAllHeaderMapForTest  L9010
findAllSheetRowNumber  L9014
detectIdentityOverwrites  L9144
createAllSheetRow  L9633
writeOriginSetIdCell  L9805
writeRecordRow  L10103
resolveStorageLocation  L10812
showWriteGuard  L10839
promoteCoinDraftToAllSheetUnlocked  L11896
forceAddCoinDraft  L23530

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5818
getReferenceImageToken  L5861
fetchReferenceImageBlob  L5893
ensureReferenceImageFetch  L5924
__setSplashTimingsForTest  L6438
noteRetryAfter  L6468
abortStartupRequests  L6515
withRequestTimeout  L6522
refetchMissingLiveNavSheets  L7306
liveDataMode  L7422
saveDocketQueue  L12255
hasReferenceImage  L14544
applyRealReferenceImage  L14687

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7535
graph  L8405
loadDocketQueue  L12191
galleryFlipEntry  L13034
buildCertLookupUrl  L13303
spotlightCoinList  L14425
applyDiscContent  L14601
originSetIdKeysMatch  L17249
setChildrenFor  L17254
compositionTextFor  L17532
resolveChildParentSet  L17642
renderDetailAccordions  L17797
buildSetChildRow  L18466
catalogFunFactFor  L19040
formatCurrency  L19301
renderStats  L24669

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6603
buildLookupCategoryList  L7258
activeDbSets  L7356
coinMatchesSearchQuery  L15457
metalCategoryFor  L15629
coinsTabBaseRows  L16446
medalTabBaseRows  L16459
applyCoinsTabFilters  L16483
applySetsTabFilters  L16510
renderSetChecklist  L16534
rollYearNumber  L16591
applyRollsTabFilters  L16638
resetBrowseFilters  L16695
showBrowseTab  L16743
detailTitleText  L17376
ownedSetForSetId  L35530
applyAddSetContext  L36130

## CoinID matcher

activeLookupGraders  L7358
knownDbCoinsFinishValues  L20092
dbCoinsCandidatesFor  L20107
docketRecheckEntry  L22289
runWithButtonPending  L23330
promoteCoinDraft  L23483
recheckCoinDraftMatch  L23683
lookupDescriptionCandidates  L31625
normField  L31696
addCoinIdentityShape  L31735
currentAddCoinMatchState  L31794
checkDbCoinsMatch  L31820
resolveAddCoinCatalogMatch  L31932
parsePcgsLabel  L32303
updateSaveConfidenceUI  L32967
completeAddCoinSave  L33258

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7580
coinDetailsFor  L12680
setNavBack  L14000
navigate  L14062
initCabinet  L14353
updateDocketFob  L14386
resetSpotlightTimer  L15371
browseMetalTest  L16063
sortRollRows  L16604
rollsMetalTest  L16630
armLeaveGuard  L27675
mintMarkOtherSelected  L32647
selectMintMarkOther  L32651
buildSplashDiagnosticText  L35000
runSplashConnect  L35037
docketQueueReady  L35114

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8415
__resetWorkbookWebUrlCacheForTest  L8424
getCachedFolderWebUrl  L8434
flagCoinIdNeedsRelink  L10735
listSetDrafts  L11176
dismissSetDraftGap  L11225
buildDocketEntry  L12282
docketOpenEntries  L12315
appendDocketEntry  L12325
coinMissingPhoto  L15496
wireStaticAccordionToggle  L19189
performBrowseEditWrite  L19775
renderNeedsAttentionHub  L22439
appendDocketRows  L22817
buildCoinRecordFromForm  L33079

## Flip card and corner labels

mapWorkbookRowToCoin  L6637
wireSideToggle  L14663
renderCornerLines  L14706
wrapTextToTwoLines  L14729
renderFittedCornerLines  L14791
renderTypeDenomCorner  L15003
gradeDesignationCornerText  L15152
applyFlipCorners  L15165
cornerClearsDisc  L15846
shrinkCornerToFit  L15906
setCompositionCornerText  L16009
renderBrowseGrid  L16205
toggleBrowseDetailSide  L17191
showBrowseDetail  L17384
isSetRow  L17578
escapeHtmlText  L25422

## Former Holdings and Purge

formerHoldings  L8618
writePurgedCell  L9838
patchRecordRow  L10136
readRecordRows  L10177
buildPhotoRowPatch  L10357
clearPhotoRowField  L10374
purgeablePhotosFor  L10430
fileRowsForPhotos  L10471
finalisePurgedFlag  L10528
purgeCoinPhotos  L10567
activeYearFilterState  L16390
yearRowTestAgainst  L16398
updateActiveYearFilterButtonUI  L16423
applyAfterYearFilterChange  L16427
browseStepListFallback  L17282
renderFormerHoldings  L25039

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8640
setSelectValuePreservingUnknown  L18646
coinValueFigure  L19345
ensureSpotPricesForMeltLabels  L19400
loadSpotPrices  L23937
renderSpotPrices  L23994
refreshLedgerValueTiles  L24786

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10652
recordPromotedCoinRecords  L11769
seriesLabel  L14492
sanitizeSeriesName  L14523
referenceSeriesKey  L14527
showBrowseEditSetView  L19062
commitReceiptCapture  L25780
photoCommitTargetId  L27064
unsavedEditsForView  L27469
refreshEditSaveState  L27613
buildPhotoPairSlot  L29087
manageOpenEndedBlock  L29647
renderManagePhotos  L29826
renderManagePhotosInto  L29843
uploadCoinDraftPhotos  L33179
uploadDraftPhoto  L36169
