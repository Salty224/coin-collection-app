# Code map: app.html, function -> line (generated)

`app.html` is 38,083 lines. Generated from `632f8e0` (the last code commit of `claude/finish-list-ar`, (ar), fast-forwarded to main 7 Nov 2026; `app.html` last changed in `c520e3d`; the later commits and the merge's docs commit do not touch it) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5454  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L5979  STORED PHOTOS / RECEIPTS
L5981  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6342  LIVE NAV DATA
L9113  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L9767  BROWSE EDIT WRITE LAYER
L10734  COINID RE-LINKING ON IDENTITY EDIT
L11115  SET ATTACH / DETACH — A
L11326  PHOTOS / RECEIPTS TABLE WRITE LAYER
L11784  PURGE
L12143  CONTAINERS READ-LAYER JOIN
L12220  WRITE-LAYER GUARD DIALOGS
L12621  ADD COIN
L12925  ADD COIN PHASE 2
L13478  DOCKET RESEARCH QUEUE
L13852  FAKE DATA
L14136  PHOTO GALLERY & CROP PIPELINE
L15648  SECTION LOADING INDICATOR
L15684  SHARING
L15717  DASHBOARD
L19116  RECORD ACCORDIONS
L19565  BROWSE DETAIL — EDIT
L21917  ALBUMS
L23380  WISHLIST
L23546  NEEDS ATTENTION
L24325  STAGING REVIEW — P
L25318  STATS & VALUE
L25442  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L26328  FORMER HOLDINGS
L26789  RECEIPT
L27022  COMMIT A CAPTURED RECEIPT
L27858  PHOTO CROP ADJUSTER
L28080  STAGE 1 — BACKGROUND CROP
L28364  CROP PIPELINE ORCHESTRATOR
L28443  COMMIT A CAPTURED PHOTO
L28626  STORED PHOTOS IN THE CAPTURE UI
L28713  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L29320  PHOTOS WAIT FOR SAVE (O
L29729  CROP FROM AN UPLOADED PHOTO
L30236  GALLERY CAPTURE WIDGET
L30356  SUB-GROUP PHOTO SHEET
L30383  DRAFT MODE (A
L30708  ADD SET
L30859  ADD SET STEP 2
L30928  MANAGE PHOTOS
L31591  GALLERY DISPLAY
L31690  IN-APP MEDIA VIEWER
L32642  FILES PICKER + PHOTO GUARD (A
L32677  UNIFIED IMAGE CHOOSER (O
L32744  PHOTO SLOTS
L32871  ADD COIN
L32903  GRADE PICKER
L32972  DESCRIPTION AUTO-FILL
L33492  DESCRIPTION CONSISTENCY GATE (A
L33682  PCGS LABEL AUTO-POPULATE
L34294  DIRECT-WRITE
L34640  ADD COIN SAVE — P
L35168  EDITING AN EXISTING STAGING DRAFT (P
L35409  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L36260  YEAR PICKER
L36712  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8221
activeCoins  L8596
isExitStatus  L9889
ownedCoins  L9902
buildCoinDraft  L12687
coinDraftToAllValues  L13009
compositionLabelCandidates  L17113
setFittedCornerText  L17133
roundToCents  L20675
valueWithFaceFloor  L20717
refreshVarietyOptions  L33459
applyDbCoinsRowToForm  L33783
readAddCoinFormForDraft  L34519
refreshAddCoinCategoryUI  L15197
addCoinDirectSaveGaps  L34329
addCoinMatchResolved  L34362
addCoinGateMessage  L34351
saveCoinDraftEdit  L34853
resetAddCoinForm  L35034
applyCoinDraftToForm  L35232

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L10484
saveCoinRowToWorkbook  L10661
writeCoinIdCell  L10804
setDraftFolder  L12471
coinDraftFolder  L12656
setFlipPhotoUrl  L14439
readBrowseEditForm  L20936
checkDesignationReresolution  L21809
collectionIdNumber  L24342
renderStagingList  L24381
promoteStagedCoin  L24701
rejectStagedCoin  L25267
findDbCoinsMatch  L33127
isVarietyRecognized  L33486
renderAmbiguousMatchList  L33910
isConfidentMatch  L34335
coinDraftPromoteGaps  L13219
allRowHoldsCoinDraft  L13242
coinOnLoadedAllSheet  L12848
coinDraftStaleOnAll  L12860
markCoinDraftAlreadyPromoted  L24835
finishCoinDraftWrite  L24781

## Add Set

getWriteToken  L9153
reservationIdNumber  L12403
addChildToSetDraft  L12581
plannedPromotionMoves  L13770
matchDbSetsByProductCode  L36803
dbSetTypeName  L36821
composeSetName  L36837
categoryFromLineage  L36877
readAddSetYear  L37344
resumeSetDraftAtStep1  L37467
startSetCapture  L37601
allSubGroupsFull  L37713
renderChildStep  L37719
readChildFormValues  L37827
restoreChildFormValues  L37842
saveCurrentChild  L37890

## Albums

mapWorkbookRowToDbSet  L8011
buildLiveAlbums  L8150
activeDbCoins  L8598
activeAlbums  L8714
setBrowseStepContext  L17595
resolveCoinAlbumLink  L18954
renderAlbumsList  L22140
initAlbums  L22195
computeAlbumPageRows  L22304
openAlbumAtPage  L22463
showAlbumDetail  L22548
slotMintage  L22579
formatAlbumMintage  L22600
renderSlotCell  L22804
turnAlbumPage  L23110
renderAlbumBook  L23207

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10251
ensureAllHeaderMap  L10269
ensureSheetHeaderMap  L11402
missingWriteColumns  L10287
assertNoFormulaCells  L10319
readAllRowForWrite  L10402
batchWriteError  L10208
partialSaveResult  L10561

refreshLiveCoinsAfterWrite  L9107
__setBrowseEditWriteEnabledForTest  L9999
excelSerialToday  L10050
workbookDateToday  L10089
localISODateToday  L10132
toWorkbookDate  L10139
__resetAllHeaderMapForTest  L10330
findAllSheetRowNumber  L10334
detectIdentityOverwrites  L10464
createAllSheetRow  L11021
writeOriginSetIdCell  L11193
writeRecordRow  L11491
resolveStorageLocation  L12200
showWriteGuard  L12227
promoteCoinDraftToAllSheetUnlocked  L13284
forceAddCoinDraft  L24937

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5839
getReferenceImageToken  L5892
fetchReferenceImageBlob  L5924
ensureReferenceImageFetch  L5955
__setSplashTimingsForTest  L6469
noteRetryAfter  L6499
abortStartupRequests  L6546
withRequestTimeout  L6553
refetchMissingLiveNavSheets  L8545
liveDataMode  L8687
saveDocketQueue  L13643
hasReferenceImage  L15935
applyRealReferenceImage  L16078

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L8800
graph  L9725
loadDocketQueue  L13579
galleryFlipEntry  L14422
buildCertLookupUrl  L14691
spotlightCoinList  L15816
applyDiscContent  L15992
originSetIdKeysMatch  L18641
setChildrenFor  L18646
compositionTextFor  L18924
resolveChildParentSet  L19034
renderDetailAccordions  L19189
buildSetChildRow  L19858
catalogFunFactFor  L20435
formatCurrency  L20696
renderStats  L26076

## Catalog, Sets tab, Rolls, live-nav data

colVal  L7787
buildLookupCategoryList  L8497
activeDbSets  L8597
coinMatchesSearchQuery  L16848
metalCategoryFor  L17020
coinsTabBaseRows  L17838
medalTabBaseRows  L17851
applyCoinsTabFilters  L17875
applySetsTabFilters  L17902
renderSetChecklist  L17926
rollYearNumber  L17983
applyRollsTabFilters  L18030
resetBrowseFilters  L18087
showBrowseTab  L18135
detailTitleText  L18768
ownedSetForSetId  L36955
applyAddSetContext  L37555

## CoinID matcher

activeLookupGraders  L8599
knownDbCoinsFinishValues  L21499
dbCoinsCandidatesFor  L21514
docketRecheckEntry  L23696
runWithButtonPending  L24737
promoteCoinDraft  L24890
recheckCoinDraftMatch  L25090
lookupDescriptionCandidates  L33034
normField  L33105
addCoinIdentityShape  L33144
currentAddCoinMatchState  L33203
checkDbCoinsMatch  L33229
resolveAddCoinCatalogMatch  L33341
parsePcgsLabel  L33712
updateSaveConfidenceUI  L34383
completeAddCoinSave  L34675

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L8845
coinDetailsFor  L14068
setNavBack  L15388
navigate  L15450
initCabinet  L15744
updateDocketFob  L15777
resetSpotlightTimer  L16762
browseMetalTest  L17454
sortRollRows  L17996
rollsMetalTest  L18022
armLeaveGuard  L29082
mintMarkOtherSelected  L34063
selectMintMarkOther  L34067
buildSplashDiagnosticText  L36425
runSplashConnect  L36462
docketQueueReady  L36539

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L9735
__resetWorkbookWebUrlCacheForTest  L9744
getCachedFolderWebUrl  L9754
flagCoinIdNeedsRelink  L12123
listSetDrafts  L12564
dismissSetDraftGap  L12613
buildDocketEntry  L13670
docketOpenEntries  L13703
appendDocketEntry  L13713
coinMissingPhoto  L16887
wireStaticAccordionToggle  L20584
performBrowseEditWrite  L21174
renderNeedsAttentionHub  L23846
appendDocketRows  L24224
buildCoinRecordFromForm  L34495

## Flip card and corner labels

mapWorkbookRowToCoin  L7821
wireSideToggle  L16054
renderCornerLines  L16097
wrapTextToTwoLines  L16120
renderFittedCornerLines  L16182
renderTypeDenomCorner  L16394
gradeDesignationCornerText  L16543
applyFlipCorners  L16556
cornerClearsDisc  L17237
shrinkCornerToFit  L17297
setCompositionCornerText  L17400
renderBrowseGrid  L17597
toggleBrowseDetailSide  L18583
showBrowseDetail  L18776
isSetRow  L18970
escapeHtmlText  L26829

## Former Holdings and Purge

formerHoldings  L9938
writePurgedCell  L11226
patchRecordRow  L11524
readRecordRows  L11565
buildPhotoRowPatch  L11745
clearPhotoRowField  L11762
purgeablePhotosFor  L11818
fileRowsForPhotos  L11859
finalisePurgedFlag  L11916
purgeCoinPhotos  L11955
activeYearFilterState  L17782
yearRowTestAgainst  L17790
updateActiveYearFilterButtonUI  L17815
applyAfterYearFilterChange  L17819
browseStepListFallback  L18674
renderFormerHoldings  L26446

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L9960
setSelectValuePreservingUnknown  L20038
coinValueFigure  L20740
ensureSpotPricesForMeltLabels  L20795
loadSpotPrices  L25344
renderSpotPrices  L25401
refreshLedgerValueTiles  L26193

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L12040
recordPromotedCoinRecords  L13157
seriesLabel  L15883
sanitizeSeriesName  L15914
referenceSeriesKey  L15918
showBrowseEditSetView  L20457
commitReceiptCapture  L27187
photoCommitTargetId  L28471
unsavedEditsForView  L28876
refreshEditSaveState  L29020
buildPhotoPairSlot  L30496
manageOpenEndedBlock  L31056
renderManagePhotos  L31235
renderManagePhotosInto  L31252
uploadCoinDraftPhotos  L34595
uploadDraftPhoto  L37594

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L9004
checkSessionAgainstWorkbook  L7165
checkWorkbookVersion  L6807
deleteWorkbookCacheForWrite  L7514
fetchWorkbookSheetRows  L6579
fetchWorkbookVersion  L6761
finishCoinRowSave  L10650
fullReadVersionTrusted  L7237
gatedGraphClient  L7093
hashSheetValues  L7245
idbOpenCache  L7462
isMsalNetworkError  L7373
launchFromSavedCopy  L7604
loadWorkbookCacheRecord  L7568
noteFullReadReport  L6707
noteRecentRowWrite  L10609
noteSaveOutcome  L10634
onFullReadLanded  L7257
recordWorkbookVersionCheck  L6791
refreshSessionFromWorkbook  L7212
renderDocketDataLine  L7676
renderLagProbe  L7759
renderLoadReport  L6864
renderSessionState  L7328
rowsFromSheetValues  L6640
saveWorkbookCacheAfterRead  L7521
setConnectionTrouble  L7138
settleSavedCopyVersion  L7632
startLagProbe  L7727
tokenFailureAction  L7383
whenWritesAllowed  L7296
withRecentWrites  L10620
withSaveTiming  L6976
workbookSessionChecked  L7051
workbookWritesAllowed  L7055

## Add Coin Finish list from Lookup_Finishes ((ar), merged 7 Nov 2026)

activeLookupFinishes  L8612
addCoinCatalogFinish  L34343
applyCoinDraftToForm  L35232
applyDbCoinsRowToForm  L33783
applyLiveNavOptionalRows  L8425
buildLookupFinishList  L8475
catalogFinishGroupKey  L17494
populateFinishOptions  L8619
refetchMissingLiveNavSheets  L8545
resetAddCoinForm  L35034
setSelectValuePreservingUnknown  L20038
