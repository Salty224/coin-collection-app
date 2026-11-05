# Code map: app.html, function -> line (generated)

`app.html` is 36,267 lines. Generated from `CODECOMMIT` (the code commit of `claude/addcoin-finish-required-and-draft-cleanup` after the adoption change; a later docs-only commit on that branch does not move any line) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L11763  DOCKET RESEARCH QUEUE
L12137  FAKE DATA
L12421  PHOTO GALLERY & CROP PIPELINE
L13930  SECTION LOADING INDICATOR
L13966  SHARING
L13999  DASHBOARD
L17397  RECORD ACCORDIONS
L17846  BROWSE DETAIL — EDIT
L20179  ALBUMS
L21642  WISHLIST
L21808  NEEDS ATTENTION
L22578  STAGING REVIEW — P
L23543  STATS & VALUE
L23667  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24553  FORMER HOLDINGS
L25014  RECEIPT
L25247  COMMIT A CAPTURED RECEIPT
L26083  PHOTO CROP ADJUSTER
L26305  STAGE 1 — BACKGROUND CROP
L26589  CROP PIPELINE ORCHESTRATOR
L26668  COMMIT A CAPTURED PHOTO
L26851  STORED PHOTOS IN THE CAPTURE UI
L26938  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27545  PHOTOS WAIT FOR SAVE (O
L27952  CROP FROM AN UPLOADED PHOTO
L28459  GALLERY CAPTURE WIDGET
L28579  SUB-GROUP PHOTO SHEET
L28606  DRAFT MODE (A
L28931  ADD SET
L29082  ADD SET STEP 2
L29151  MANAGE PHOTOS
L29814  GALLERY DISPLAY
L29913  IN-APP MEDIA VIEWER
L30865  FILES PICKER + PHOTO GUARD (A
L30900  UNIFIED IMAGE CHOOSER (O
L30967  PHOTO SLOTS
L31094  ADD COIN
L31126  GRADE PICKER
L31195  DESCRIPTION AUTO-FILL
L31715  DESCRIPTION CONSISTENCY GATE (A
L31905  PCGS LABEL AUTO-POPULATE
L32510  DIRECT-WRITE
L32856  ADD COIN SAVE — P
L33378  EDITING AN EXISTING STAGING DRAFT (P
L33617  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L34467  YEAR PICKER
L34919  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7037
activeCoins  L7352
isExitStatus  L8518
ownedCoins  L8531
buildCoinDraft  L11036
coinDraftToAllValues  L11358
compositionLabelCandidates  L15395
setFittedCornerText  L15415
roundToCents  L18953
valueWithFaceFloor  L18995
refreshVarietyOptions  L31682
applyDbCoinsRowToForm  L32006
readAddCoinFormForDraft  L32735
refreshAddCoinCategoryUI  L13482
addCoinDirectSaveGaps  L32545
addCoinMatchResolved  L32578
addCoinGateMessage  L32567
saveCoinDraftEdit  L33064
resetAddCoinForm  L33245
applyCoinDraftToForm  L33442

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L9009
saveCoinRowToWorkbook  L9076
writeCoinIdCell  L9192
setDraftFolder  L10820
coinDraftFolder  L11005
setFlipPhotoUrl  L12724
readBrowseEditForm  L19214
checkDesignationReresolution  L20071
collectionIdNumber  L22595
renderStagingList  L22634
promoteStagedCoin  L22954
rejectStagedCoin  L23492
findDbCoinsMatch  L31350
isVarietyRecognized  L31709
renderAmbiguousMatchList  L32126
isConfidentMatch  L32551
coinDraftPromoteGaps  L11568
allRowHoldsCoinDraft  L11581
coinOnLoadedAllSheet  L11197
coinDraftStaleOnAll  L11209
markCoinDraftAlreadyPromoted  L23078
finishCoinDraftWrite  L23034

## Add Set

getWriteToken  L7837
reservationIdNumber  L10752
addChildToSetDraft  L10930
plannedPromotionMoves  L12055
matchDbSetsByProductCode  L35010
dbSetTypeName  L35028
composeSetName  L35044
categoryFromLineage  L35084
readAddSetYear  L35551
resumeSetDraftAtStep1  L35674
startSetCapture  L35808
allSubGroupsFull  L35920
renderChildStep  L35926
readChildFormValues  L36034
restoreChildFormValues  L36049
saveCurrentChild  L36097

## Albums

mapWorkbookRowToDbSet  L6827
buildLiveAlbums  L6966
activeDbCoins  L7354
activeAlbums  L7446
setBrowseStepContext  L15876
resolveCoinAlbumLink  L17235
renderAlbumsList  L20402
initAlbums  L20457
computeAlbumPageRows  L20566
openAlbumAtPage  L20725
showAlbumDetail  L20810
slotMintage  L20841
formatAlbumMintage  L20862
renderSlotCell  L21066
turnAlbumPage  L21372
renderAlbumBook  L21469

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
promoteCoinDraftToAllSheetUnlocked  L11611
forceAddCoinDraft  L23162

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
saveDocketQueue  L11928
hasReferenceImage  L14217
applyRealReferenceImage  L14360

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7532
graph  L8354
loadDocketQueue  L11864
galleryFlipEntry  L12707
buildCertLookupUrl  L12976
spotlightCoinList  L14098
applyDiscContent  L14274
originSetIdKeysMatch  L16922
setChildrenFor  L16927
compositionTextFor  L17205
resolveChildParentSet  L17315
renderDetailAccordions  L17470
buildSetChildRow  L18139
catalogFunFactFor  L18713
formatCurrency  L18974
renderStats  L24301

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6603
buildLookupCategoryList  L7257
activeDbSets  L7353
coinMatchesSearchQuery  L15130
metalCategoryFor  L15302
coinsTabBaseRows  L16119
medalTabBaseRows  L16132
applyCoinsTabFilters  L16156
applySetsTabFilters  L16183
renderSetChecklist  L16207
rollYearNumber  L16264
applyRollsTabFilters  L16311
resetBrowseFilters  L16368
showBrowseTab  L16416
detailTitleText  L17049
ownedSetForSetId  L35162
applyAddSetContext  L35762

## CoinID matcher

activeLookupGraders  L7355
knownDbCoinsFinishValues  L19761
dbCoinsCandidatesFor  L19776
docketRecheckEntry  L21958
runWithButtonPending  L22990
promoteCoinDraft  L23120
recheckCoinDraftMatch  L23315
lookupDescriptionCandidates  L31257
normField  L31328
addCoinIdentityShape  L31367
currentAddCoinMatchState  L31426
checkDbCoinsMatch  L31452
resolveAddCoinCatalogMatch  L31564
parsePcgsLabel  L31935
updateSaveConfidenceUI  L32599
completeAddCoinSave  L32890

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7577
coinDetailsFor  L12353
setNavBack  L13673
navigate  L13735
initCabinet  L14026
updateDocketFob  L14059
resetSpotlightTimer  L15044
browseMetalTest  L15736
sortRollRows  L16277
rollsMetalTest  L16303
armLeaveGuard  L27307
mintMarkOtherSelected  L32279
selectMintMarkOther  L32283
buildSplashDiagnosticText  L34632
runSplashConnect  L34669
docketQueueReady  L34746

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8364
__resetWorkbookWebUrlCacheForTest  L8373
getCachedFolderWebUrl  L8383
flagCoinIdNeedsRelink  L10475
listSetDrafts  L10913
dismissSetDraftGap  L10962
buildDocketEntry  L11955
docketOpenEntries  L11988
appendDocketEntry  L11998
coinMissingPhoto  L15169
wireStaticAccordionToggle  L18862
performBrowseEditWrite  L19448
renderNeedsAttentionHub  L22108
appendDocketRows  L22477
buildCoinRecordFromForm  L32711

## Flip card and corner labels

mapWorkbookRowToCoin  L6637
wireSideToggle  L14336
renderCornerLines  L14379
wrapTextToTwoLines  L14402
renderFittedCornerLines  L14464
renderTypeDenomCorner  L14676
gradeDesignationCornerText  L14825
applyFlipCorners  L14838
cornerClearsDisc  L15519
shrinkCornerToFit  L15579
setCompositionCornerText  L15682
renderBrowseGrid  L15878
toggleBrowseDetailSide  L16864
showBrowseDetail  L17057
isSetRow  L17251
escapeHtmlText  L25054

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
activeYearFilterState  L16063
yearRowTestAgainst  L16071
updateActiveYearFilterButtonUI  L16096
applyAfterYearFilterChange  L16100
browseStepListFallback  L16955
renderFormerHoldings  L24671

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8589
setSelectValuePreservingUnknown  L18319
coinValueFigure  L19018
ensureSpotPricesForMeltLabels  L19073
loadSpotPrices  L23569
renderSpotPrices  L23626
refreshLedgerValueTiles  L24418

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10392
recordPromotedCoinRecords  L11506
seriesLabel  L14165
sanitizeSeriesName  L14196
referenceSeriesKey  L14200
showBrowseEditSetView  L18735
commitReceiptCapture  L25412
photoCommitTargetId  L26696
unsavedEditsForView  L27101
refreshEditSaveState  L27245
buildPhotoPairSlot  L28719
manageOpenEndedBlock  L29279
renderManagePhotos  L29458
renderManagePhotosInto  L29475
uploadCoinDraftPhotos  L32811
uploadDraftPhoto  L35801
