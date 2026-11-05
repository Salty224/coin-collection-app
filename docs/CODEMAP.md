# Code map: app.html, function -> line (generated)

`app.html` is 36,248 lines. Generated from `0052e44` (the code commit of `claude/addcoin-finish-required-and-draft-cleanup`; a later docs-only commit on that branch does not move any line) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L11744  DOCKET RESEARCH QUEUE
L12118  FAKE DATA
L12402  PHOTO GALLERY & CROP PIPELINE
L13911  SECTION LOADING INDICATOR
L13947  SHARING
L13980  DASHBOARD
L17378  RECORD ACCORDIONS
L17827  BROWSE DETAIL — EDIT
L20160  ALBUMS
L21623  WISHLIST
L21789  NEEDS ATTENTION
L22559  STAGING REVIEW — P
L23524  STATS & VALUE
L23648  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24534  FORMER HOLDINGS
L24995  RECEIPT
L25228  COMMIT A CAPTURED RECEIPT
L26064  PHOTO CROP ADJUSTER
L26286  STAGE 1 — BACKGROUND CROP
L26570  CROP PIPELINE ORCHESTRATOR
L26649  COMMIT A CAPTURED PHOTO
L26832  STORED PHOTOS IN THE CAPTURE UI
L26919  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27526  PHOTOS WAIT FOR SAVE (O
L27933  CROP FROM AN UPLOADED PHOTO
L28440  GALLERY CAPTURE WIDGET
L28560  SUB-GROUP PHOTO SHEET
L28587  DRAFT MODE (A
L28912  ADD SET
L29063  ADD SET STEP 2
L29132  MANAGE PHOTOS
L29795  GALLERY DISPLAY
L29894  IN-APP MEDIA VIEWER
L30846  FILES PICKER + PHOTO GUARD (A
L30881  UNIFIED IMAGE CHOOSER (O
L30948  PHOTO SLOTS
L31075  ADD COIN
L31107  GRADE PICKER
L31176  DESCRIPTION AUTO-FILL
L31696  DESCRIPTION CONSISTENCY GATE (A
L31886  PCGS LABEL AUTO-POPULATE
L32491  DIRECT-WRITE
L32837  ADD COIN SAVE — P
L33359  EDITING AN EXISTING STAGING DRAFT (P
L33598  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L34448  YEAR PICKER
L34900  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7037
activeCoins  L7352
isExitStatus  L8518
ownedCoins  L8531
buildCoinDraft  L11036
coinDraftToAllValues  L11358
compositionLabelCandidates  L15376
setFittedCornerText  L15396
roundToCents  L18934
valueWithFaceFloor  L18976
refreshVarietyOptions  L31663
applyDbCoinsRowToForm  L31987
readAddCoinFormForDraft  L32716
refreshAddCoinCategoryUI  L13463
addCoinDirectSaveGaps  L32526
addCoinMatchResolved  L32559
addCoinGateMessage  L32548
saveCoinDraftEdit  L33045
resetAddCoinForm  L33226
applyCoinDraftToForm  L33423

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L9009
saveCoinRowToWorkbook  L9076
writeCoinIdCell  L9192
setDraftFolder  L10820
coinDraftFolder  L11005
setFlipPhotoUrl  L12705
readBrowseEditForm  L19195
checkDesignationReresolution  L20052
collectionIdNumber  L22576
renderStagingList  L22615
promoteStagedCoin  L22935
rejectStagedCoin  L23473
findDbCoinsMatch  L31331
isVarietyRecognized  L31690
renderAmbiguousMatchList  L32107
isConfidentMatch  L32532
coinDraftPromoteGaps  L11568
allRowHoldsCoinDraft  L11577
coinOnLoadedAllSheet  L11197
coinDraftStaleOnAll  L11209
markCoinDraftAlreadyPromoted  L23059
finishCoinDraftWrite  L23015

## Add Set

getWriteToken  L7837
reservationIdNumber  L10752
addChildToSetDraft  L10930
plannedPromotionMoves  L12036
matchDbSetsByProductCode  L34991
dbSetTypeName  L35009
composeSetName  L35025
categoryFromLineage  L35065
readAddSetYear  L35532
resumeSetDraftAtStep1  L35655
startSetCapture  L35789
allSubGroupsFull  L35901
renderChildStep  L35907
readChildFormValues  L36015
restoreChildFormValues  L36030
saveCurrentChild  L36078

## Albums

mapWorkbookRowToDbSet  L6827
buildLiveAlbums  L6966
activeDbCoins  L7354
activeAlbums  L7446
setBrowseStepContext  L15857
resolveCoinAlbumLink  L17216
renderAlbumsList  L20383
initAlbums  L20438
computeAlbumPageRows  L20547
openAlbumAtPage  L20706
showAlbumDetail  L20791
slotMintage  L20822
formatAlbumMintage  L20843
renderSlotCell  L21047
turnAlbumPage  L21353
renderAlbumBook  L21450

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
promoteCoinDraftToAllSheetUnlocked  L11598
forceAddCoinDraft  L23143

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
saveDocketQueue  L11909
hasReferenceImage  L14198
applyRealReferenceImage  L14341

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7532
graph  L8354
loadDocketQueue  L11845
galleryFlipEntry  L12688
buildCertLookupUrl  L12957
spotlightCoinList  L14079
applyDiscContent  L14255
originSetIdKeysMatch  L16903
setChildrenFor  L16908
compositionTextFor  L17186
resolveChildParentSet  L17296
renderDetailAccordions  L17451
buildSetChildRow  L18120
catalogFunFactFor  L18694
formatCurrency  L18955
renderStats  L24282

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6603
buildLookupCategoryList  L7257
activeDbSets  L7353
coinMatchesSearchQuery  L15111
metalCategoryFor  L15283
coinsTabBaseRows  L16100
medalTabBaseRows  L16113
applyCoinsTabFilters  L16137
applySetsTabFilters  L16164
renderSetChecklist  L16188
rollYearNumber  L16245
applyRollsTabFilters  L16292
resetBrowseFilters  L16349
showBrowseTab  L16397
detailTitleText  L17030
ownedSetForSetId  L35143
applyAddSetContext  L35743

## CoinID matcher

activeLookupGraders  L7355
knownDbCoinsFinishValues  L19742
dbCoinsCandidatesFor  L19757
docketRecheckEntry  L21939
runWithButtonPending  L22971
promoteCoinDraft  L23101
recheckCoinDraftMatch  L23296
lookupDescriptionCandidates  L31238
normField  L31309
addCoinIdentityShape  L31348
currentAddCoinMatchState  L31407
checkDbCoinsMatch  L31433
resolveAddCoinCatalogMatch  L31545
parsePcgsLabel  L31916
updateSaveConfidenceUI  L32580
completeAddCoinSave  L32871

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7577
coinDetailsFor  L12334
setNavBack  L13654
navigate  L13716
initCabinet  L14007
updateDocketFob  L14040
resetSpotlightTimer  L15025
browseMetalTest  L15717
sortRollRows  L16258
rollsMetalTest  L16284
armLeaveGuard  L27288
mintMarkOtherSelected  L32260
selectMintMarkOther  L32264
buildSplashDiagnosticText  L34613
runSplashConnect  L34650
docketQueueReady  L34727

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8364
__resetWorkbookWebUrlCacheForTest  L8373
getCachedFolderWebUrl  L8383
flagCoinIdNeedsRelink  L10475
listSetDrafts  L10913
dismissSetDraftGap  L10962
buildDocketEntry  L11936
docketOpenEntries  L11969
appendDocketEntry  L11979
coinMissingPhoto  L15150
wireStaticAccordionToggle  L18843
performBrowseEditWrite  L19429
renderNeedsAttentionHub  L22089
appendDocketRows  L22458
buildCoinRecordFromForm  L32692

## Flip card and corner labels

mapWorkbookRowToCoin  L6637
wireSideToggle  L14317
renderCornerLines  L14360
wrapTextToTwoLines  L14383
renderFittedCornerLines  L14445
renderTypeDenomCorner  L14657
gradeDesignationCornerText  L14806
applyFlipCorners  L14819
cornerClearsDisc  L15500
shrinkCornerToFit  L15560
setCompositionCornerText  L15663
renderBrowseGrid  L15859
toggleBrowseDetailSide  L16845
showBrowseDetail  L17038
isSetRow  L17232
escapeHtmlText  L25035

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
activeYearFilterState  L16044
yearRowTestAgainst  L16052
updateActiveYearFilterButtonUI  L16077
applyAfterYearFilterChange  L16081
browseStepListFallback  L16936
renderFormerHoldings  L24652

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8589
setSelectValuePreservingUnknown  L18300
coinValueFigure  L18999
ensureSpotPricesForMeltLabels  L19054
loadSpotPrices  L23550
renderSpotPrices  L23607
refreshLedgerValueTiles  L24399

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10392
recordPromotedCoinRecords  L11506
seriesLabel  L14146
sanitizeSeriesName  L14177
referenceSeriesKey  L14181
showBrowseEditSetView  L18716
commitReceiptCapture  L25393
photoCommitTargetId  L26677
unsavedEditsForView  L27082
refreshEditSaveState  L27226
buildPhotoPairSlot  L28700
manageOpenEndedBlock  L29260
renderManagePhotos  L29439
renderManagePhotosInto  L29456
uploadCoinDraftPhotos  L32792
uploadDraftPhoto  L35782
