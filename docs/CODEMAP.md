# Code map: app.html, function -> line (generated)

`app.html` is 36,283 lines. Generated from `1636f39` (the code commit of `claude/addcoin-finish-required-and-draft-cleanup` after the F7 change; a later docs-only commit on that branch does not move any line) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L9482  SET ATTACH / DETACH — A
L9685  PHOTOS / RECEIPTS TABLE WRITE LAYER
L10136  PURGE
L10495  CONTAINERS READ-LAYER JOIN
L10569  WRITE-LAYER GUARD DIALOGS
L10970  ADD COIN
L11274  ADD COIN PHASE 2
L11777  DOCKET RESEARCH QUEUE
L12151  FAKE DATA
L12435  PHOTO GALLERY & CROP PIPELINE
L13944  SECTION LOADING INDICATOR
L13980  SHARING
L14013  DASHBOARD
L17411  RECORD ACCORDIONS
L17860  BROWSE DETAIL — EDIT
L20193  ALBUMS
L21656  WISHLIST
L21822  NEEDS ATTENTION
L22592  STAGING REVIEW — P
L23559  STATS & VALUE
L23683  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24569  FORMER HOLDINGS
L25030  RECEIPT
L25263  COMMIT A CAPTURED RECEIPT
L26099  PHOTO CROP ADJUSTER
L26321  STAGE 1 — BACKGROUND CROP
L26605  CROP PIPELINE ORCHESTRATOR
L26684  COMMIT A CAPTURED PHOTO
L26867  STORED PHOTOS IN THE CAPTURE UI
L26954  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27561  PHOTOS WAIT FOR SAVE (O
L27968  CROP FROM AN UPLOADED PHOTO
L28475  GALLERY CAPTURE WIDGET
L28595  SUB-GROUP PHOTO SHEET
L28622  DRAFT MODE (A
L28947  ADD SET
L29098  ADD SET STEP 2
L29167  MANAGE PHOTOS
L29830  GALLERY DISPLAY
L29929  IN-APP MEDIA VIEWER
L30881  FILES PICKER + PHOTO GUARD (A
L30916  UNIFIED IMAGE CHOOSER (O
L30983  PHOTO SLOTS
L31110  ADD COIN
L31142  GRADE PICKER
L31211  DESCRIPTION AUTO-FILL
L31731  DESCRIPTION CONSISTENCY GATE (A
L31921  PCGS LABEL AUTO-POPULATE
L32526  DIRECT-WRITE
L32872  ADD COIN SAVE — P
L33394  EDITING AN EXISTING STAGING DRAFT (P
L33633  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L34483  YEAR PICKER
L34935  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7037
activeCoins  L7352
isExitStatus  L8518
ownedCoins  L8531
buildCoinDraft  L11036
coinDraftToAllValues  L11358
compositionLabelCandidates  L15409
setFittedCornerText  L15429
roundToCents  L18967
valueWithFaceFloor  L19009
refreshVarietyOptions  L31698
applyDbCoinsRowToForm  L32022
readAddCoinFormForDraft  L32751
refreshAddCoinCategoryUI  L13496
addCoinDirectSaveGaps  L32561
addCoinMatchResolved  L32594
addCoinGateMessage  L32583
saveCoinDraftEdit  L33080
resetAddCoinForm  L33261
applyCoinDraftToForm  L33458

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L9009
saveCoinRowToWorkbook  L9076
writeCoinIdCell  L9192
setDraftFolder  L10820
coinDraftFolder  L11005
setFlipPhotoUrl  L12738
readBrowseEditForm  L19228
checkDesignationReresolution  L20085
collectionIdNumber  L22609
renderStagingList  L22648
promoteStagedCoin  L22968
rejectStagedCoin  L23508
findDbCoinsMatch  L31366
isVarietyRecognized  L31725
renderAmbiguousMatchList  L32142
isConfidentMatch  L32567
coinDraftPromoteGaps  L11568
allRowHoldsCoinDraft  L11587
coinOnLoadedAllSheet  L11197
coinDraftStaleOnAll  L11209
markCoinDraftAlreadyPromoted  L23092
finishCoinDraftWrite  L23048

## Add Set

getWriteToken  L7837
reservationIdNumber  L10752
addChildToSetDraft  L10930
plannedPromotionMoves  L12069
matchDbSetsByProductCode  L35026
dbSetTypeName  L35044
composeSetName  L35060
categoryFromLineage  L35100
readAddSetYear  L35567
resumeSetDraftAtStep1  L35690
startSetCapture  L35824
allSubGroupsFull  L35936
renderChildStep  L35942
readChildFormValues  L36050
restoreChildFormValues  L36065
saveCurrentChild  L36113

## Albums

mapWorkbookRowToDbSet  L6827
buildLiveAlbums  L6966
activeDbCoins  L7354
activeAlbums  L7446
setBrowseStepContext  L15890
resolveCoinAlbumLink  L17249
renderAlbumsList  L20416
initAlbums  L20471
computeAlbumPageRows  L20580
openAlbumAtPage  L20739
showAlbumDetail  L20824
slotMintage  L20855
formatAlbumMintage  L20876
renderSlotCell  L21080
turnAlbumPage  L21386
renderAlbumBook  L21483

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
createAllSheetRow  L9393
writeOriginSetIdCell  L9560
writeRecordRow  L9846
resolveStorageLocation  L10549
showWriteGuard  L10576
promoteCoinDraftToAllSheetUnlocked  L11619
forceAddCoinDraft  L23178

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
saveDocketQueue  L11942
hasReferenceImage  L14231
applyRealReferenceImage  L14374

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7532
graph  L8354
loadDocketQueue  L11878
galleryFlipEntry  L12721
buildCertLookupUrl  L12990
spotlightCoinList  L14112
applyDiscContent  L14288
originSetIdKeysMatch  L16936
setChildrenFor  L16941
compositionTextFor  L17219
resolveChildParentSet  L17329
renderDetailAccordions  L17484
buildSetChildRow  L18153
catalogFunFactFor  L18727
formatCurrency  L18988
renderStats  L24317

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6603
buildLookupCategoryList  L7257
activeDbSets  L7353
coinMatchesSearchQuery  L15144
metalCategoryFor  L15316
coinsTabBaseRows  L16133
medalTabBaseRows  L16146
applyCoinsTabFilters  L16170
applySetsTabFilters  L16197
renderSetChecklist  L16221
rollYearNumber  L16278
applyRollsTabFilters  L16325
resetBrowseFilters  L16382
showBrowseTab  L16430
detailTitleText  L17063
ownedSetForSetId  L35178
applyAddSetContext  L35778

## CoinID matcher

activeLookupGraders  L7355
knownDbCoinsFinishValues  L19775
dbCoinsCandidatesFor  L19790
docketRecheckEntry  L21972
runWithButtonPending  L23004
promoteCoinDraft  L23134
recheckCoinDraftMatch  L23331
lookupDescriptionCandidates  L31273
normField  L31344
addCoinIdentityShape  L31383
currentAddCoinMatchState  L31442
checkDbCoinsMatch  L31468
resolveAddCoinCatalogMatch  L31580
parsePcgsLabel  L31951
updateSaveConfidenceUI  L32615
completeAddCoinSave  L32906

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7577
coinDetailsFor  L12367
setNavBack  L13687
navigate  L13749
initCabinet  L14040
updateDocketFob  L14073
resetSpotlightTimer  L15058
browseMetalTest  L15750
sortRollRows  L16291
rollsMetalTest  L16317
armLeaveGuard  L27323
mintMarkOtherSelected  L32295
selectMintMarkOther  L32299
buildSplashDiagnosticText  L34648
runSplashConnect  L34685
docketQueueReady  L34762

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8364
__resetWorkbookWebUrlCacheForTest  L8373
getCachedFolderWebUrl  L8383
flagCoinIdNeedsRelink  L10475
listSetDrafts  L10913
dismissSetDraftGap  L10962
buildDocketEntry  L11969
docketOpenEntries  L12002
appendDocketEntry  L12012
coinMissingPhoto  L15183
wireStaticAccordionToggle  L18876
performBrowseEditWrite  L19462
renderNeedsAttentionHub  L22122
appendDocketRows  L22491
buildCoinRecordFromForm  L32727

## Flip card and corner labels

mapWorkbookRowToCoin  L6637
wireSideToggle  L14350
renderCornerLines  L14393
wrapTextToTwoLines  L14416
renderFittedCornerLines  L14478
renderTypeDenomCorner  L14690
gradeDesignationCornerText  L14839
applyFlipCorners  L14852
cornerClearsDisc  L15533
shrinkCornerToFit  L15593
setCompositionCornerText  L15696
renderBrowseGrid  L15892
toggleBrowseDetailSide  L16878
showBrowseDetail  L17071
isSetRow  L17265
escapeHtmlText  L25070

## Former Holdings and Purge

formerHoldings  L8567
writePurgedCell  L9589
patchRecordRow  L9879
readRecordRows  L9917
buildPhotoRowPatch  L10097
clearPhotoRowField  L10114
purgeablePhotosFor  L10170
fileRowsForPhotos  L10211
finalisePurgedFlag  L10268
purgeCoinPhotos  L10307
activeYearFilterState  L16077
yearRowTestAgainst  L16085
updateActiveYearFilterButtonUI  L16110
applyAfterYearFilterChange  L16114
browseStepListFallback  L16969
renderFormerHoldings  L24687

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8589
setSelectValuePreservingUnknown  L18333
coinValueFigure  L19032
ensureSpotPricesForMeltLabels  L19087
loadSpotPrices  L23585
renderSpotPrices  L23642
refreshLedgerValueTiles  L24434

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10392
recordPromotedCoinRecords  L11506
seriesLabel  L14179
sanitizeSeriesName  L14210
referenceSeriesKey  L14214
showBrowseEditSetView  L18749
commitReceiptCapture  L25428
photoCommitTargetId  L26712
unsavedEditsForView  L27117
refreshEditSaveState  L27261
buildPhotoPairSlot  L28735
manageOpenEndedBlock  L29295
renderManagePhotos  L29474
renderManagePhotosInto  L29491
uploadCoinDraftPhotos  L32827
uploadDraftPhoto  L35817
