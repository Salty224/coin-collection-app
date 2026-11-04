# Code map: app.html, function -> line (generated)

`app.html` is 35,744 lines. Generated from `a7fcb20` by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5410  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L5925  STORED PHOTOS / RECEIPTS
L5927  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6288  LIVE NAV DATA
L7715  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L8314  BROWSE EDIT WRITE LAYER
L9045  COINID RE-LINKING ON IDENTITY EDIT
L9395  SET ATTACH / DETACH — A
L9598  PHOTOS / RECEIPTS TABLE WRITE LAYER
L10049  PURGE
L10408  CONTAINERS READ-LAYER JOIN
L10482  WRITE-LAYER GUARD DIALOGS
L10883  ADD COIN
L11148  ADD COIN PHASE 2
L11533  DOCKET RESEARCH QUEUE
L11907  FAKE DATA
L12191  PHOTO GALLERY & CROP PIPELINE
L13658  SECTION LOADING INDICATOR
L13694  SHARING
L13727  DASHBOARD
L17125  RECORD ACCORDIONS
L17574  BROWSE DETAIL — EDIT
L19907  ALBUMS
L21370  WISHLIST
L21536  NEEDS ATTENTION
L22277  STAGING REVIEW — P
L23132  STATS & VALUE
L23256  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L24142  FORMER HOLDINGS
L24603  RECEIPT
L24836  COMMIT A CAPTURED RECEIPT
L25672  PHOTO CROP ADJUSTER
L25894  STAGE 1 — BACKGROUND CROP
L26178  CROP PIPELINE ORCHESTRATOR
L26257  COMMIT A CAPTURED PHOTO
L26440  STORED PHOTOS IN THE CAPTURE UI
L26527  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L27134  PHOTOS WAIT FOR SAVE (O
L27541  CROP FROM AN UPLOADED PHOTO
L28048  GALLERY CAPTURE WIDGET
L28168  SUB-GROUP PHOTO SHEET
L28195  DRAFT MODE (A
L28520  ADD SET
L28671  ADD SET STEP 2
L28740  MANAGE PHOTOS
L29403  GALLERY DISPLAY
L29502  IN-APP MEDIA VIEWER
L30454  FILES PICKER + PHOTO GUARD (A
L30489  UNIFIED IMAGE CHOOSER (O
L30556  PHOTO SLOTS
L30683  ADD COIN
L30715  GRADE PICKER
L30784  DESCRIPTION AUTO-FILL
L31304  DESCRIPTION CONSISTENCY GATE (A
L31494  PCGS LABEL AUTO-POPULATE
L32099  DIRECT-WRITE
L32388  ADD COIN SAVE — P
L32895  EDITING AN EXISTING STAGING DRAFT (P
L33126  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L33944  YEAR PICKER
L34396  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L7014
activeCoins  L7288
isExitStatus  L8436
ownedCoins  L8449
buildCoinDraft  L10949
coinDraftToAllValues  L11232
compositionLabelCandidates  L15123
setFittedCornerText  L15143
roundToCents  L18681
valueWithFaceFloor  L18723
refreshVarietyOptions  L31271
applyDbCoinsRowToForm  L31595
readAddCoinFormForDraft  L32267
saveCoinDraftEdit  L32583
resetAddCoinForm  L32764
applyCoinDraftToForm  L32959

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L8927
saveCoinRowToWorkbook  L8994
writeCoinIdCell  L9110
setDraftFolder  L10733
coinDraftFolder  L10918
setFlipPhotoUrl  L12494
readBrowseEditForm  L18942
checkDesignationReresolution  L19799
collectionIdNumber  L22294
renderStagingList  L22333
promoteStagedCoin  L22612
rejectStagedCoin  L23081
findDbCoinsMatch  L30939
isVarietyRecognized  L31298
renderAmbiguousMatchList  L31715
isConfidentMatch  L32126

## Add Set

getWriteToken  L7755
reservationIdNumber  L10665
addChildToSetDraft  L10843
plannedPromotionMoves  L11825
matchDbSetsByProductCode  L34487
dbSetTypeName  L34505
composeSetName  L34521
categoryFromLineage  L34561
readAddSetYear  L35028
resumeSetDraftAtStep1  L35151
startSetCapture  L35285
allSubGroupsFull  L35397
renderChildStep  L35403
readChildFormValues  L35511
restoreChildFormValues  L35526
saveCurrentChild  L35574

## Albums

mapWorkbookRowToDbSet  L6804
buildLiveAlbums  L6943
activeDbCoins  L7290
activeAlbums  L7372
setBrowseStepContext  L15604
resolveCoinAlbumLink  L16963
renderAlbumsList  L20130
initAlbums  L20185
computeAlbumPageRows  L20294
openAlbumAtPage  L20453
showAlbumDetail  L20538
slotMintage  L20569
formatAlbumMintage  L20590
renderSlotCell  L20794
turnAlbumPage  L21100
renderAlbumBook  L21197

## All-sheet write layer (Browse Edit, new rows, Set link, dates)

refreshLiveCoinsAfterWrite  L7709
__setBrowseEditWriteEnabledForTest  L8546
excelSerialToday  L8597
workbookDateToday  L8636
localISODateToday  L8679
toWorkbookDate  L8686
__resetAllHeaderMapForTest  L8782
findAllSheetRowNumber  L8786
detectIdentityOverwrites  L8907
createAllSheetRow  L9311
writeOriginSetIdCell  L9473
writeRecordRow  L9759
resolveStorageLocation  L10462
showWriteGuard  L10489
promoteCoinDraftToAllSheetUnlocked  L11447
forceAddCoinDraft  L22751

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5795
getReferenceImageToken  L5838
fetchReferenceImageBlob  L5870
ensureReferenceImageFetch  L5901
__setSplashTimingsForTest  L6415
noteRetryAfter  L6445
abortStartupRequests  L6492
withRequestTimeout  L6499
refetchMissingLiveNavSheets  L7241
liveDataMode  L7345
saveDocketQueue  L11698
hasReferenceImage  L13945
applyRealReferenceImage  L14088

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L7458
graph  L8272
loadDocketQueue  L11634
galleryFlipEntry  L12477
buildCertLookupUrl  L12746
spotlightCoinList  L13826
applyDiscContent  L14002
originSetIdKeysMatch  L16650
setChildrenFor  L16655
compositionTextFor  L16933
resolveChildParentSet  L17043
renderDetailAccordions  L17198
buildSetChildRow  L17867
catalogFunFactFor  L18441
formatCurrency  L18702
renderStats  L23890

## Catalog, Sets tab, Rolls, live-nav data

colVal  L6580
activeDbSets  L7289
coinMatchesSearchQuery  L14858
metalCategoryFor  L15030
coinsTabBaseRows  L15847
medalTabBaseRows  L15860
applyCoinsTabFilters  L15884
applySetsTabFilters  L15911
renderSetChecklist  L15935
rollYearNumber  L15992
applyRollsTabFilters  L16039
resetBrowseFilters  L16096
showBrowseTab  L16144
detailTitleText  L16777
ownedSetForSetId  L34639
applyAddSetContext  L35239

## CoinID matcher

activeLookupGraders  L7291
knownDbCoinsFinishValues  L19489
dbCoinsCandidatesFor  L19504
docketRecheckEntry  L21686
runWithButtonPending  L22648
promoteCoinDraft  L22711
recheckCoinDraftMatch  L22904
lookupDescriptionCandidates  L30846
normField  L30917
addCoinIdentityShape  L30956
currentAddCoinMatchState  L31015
checkDbCoinsMatch  L31041
resolveAddCoinCatalogMatch  L31153
parsePcgsLabel  L31524
updateSaveConfidenceUI  L32147
completeAddCoinSave  L32422

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L7503
coinDetailsFor  L12123
setNavBack  L13401
navigate  L13463
initCabinet  L13754
updateDocketFob  L13787
resetSpotlightTimer  L14772
browseMetalTest  L15464
sortRollRows  L16005
rollsMetalTest  L16031
armLeaveGuard  L26896
mintMarkOtherSelected  L31868
selectMintMarkOther  L31872
buildSplashDiagnosticText  L34109
runSplashConnect  L34146
docketQueueReady  L34223

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L8282
__resetWorkbookWebUrlCacheForTest  L8291
getCachedFolderWebUrl  L8301
flagCoinIdNeedsRelink  L10388
listSetDrafts  L10826
dismissSetDraftGap  L10875
buildDocketEntry  L11725
docketOpenEntries  L11758
appendDocketEntry  L11768
coinMissingPhoto  L14897
wireStaticAccordionToggle  L18590
performBrowseEditWrite  L19176
renderNeedsAttentionHub  L21836
appendDocketRows  L22178
buildCoinRecordFromForm  L32243

## Flip card and corner labels

mapWorkbookRowToCoin  L6614
wireSideToggle  L14064
renderCornerLines  L14107
wrapTextToTwoLines  L14130
renderFittedCornerLines  L14192
renderTypeDenomCorner  L14404
gradeDesignationCornerText  L14553
applyFlipCorners  L14566
cornerClearsDisc  L15247
shrinkCornerToFit  L15307
setCompositionCornerText  L15410
renderBrowseGrid  L15606
toggleBrowseDetailSide  L16592
showBrowseDetail  L16785
isSetRow  L16979
escapeHtmlText  L24643

## Former Holdings and Purge

formerHoldings  L8485
writePurgedCell  L9502
patchRecordRow  L9792
readRecordRows  L9830
buildPhotoRowPatch  L10010
clearPhotoRowField  L10027
purgeablePhotosFor  L10083
fileRowsForPhotos  L10124
finalisePurgedFlag  L10181
purgeCoinPhotos  L10220
activeYearFilterState  L15791
yearRowTestAgainst  L15799
updateActiveYearFilterButtonUI  L15824
applyAfterYearFilterChange  L15828
browseStepListFallback  L16683
renderFormerHoldings  L24260

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L8507
setSelectValuePreservingUnknown  L18047
coinValueFigure  L18746
ensureSpotPricesForMeltLabels  L18801
loadSpotPrices  L23158
renderSpotPrices  L23215
refreshLedgerValueTiles  L24007

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L10305
recordPromotedCoinRecords  L11380
seriesLabel  L13893
sanitizeSeriesName  L13924
referenceSeriesKey  L13928
showBrowseEditSetView  L18463
commitReceiptCapture  L25001
photoCommitTargetId  L26285
unsavedEditsForView  L26690
refreshEditSaveState  L26834
buildPhotoPairSlot  L28308
manageOpenEndedBlock  L28868
renderManagePhotos  L29047
renderManagePhotosInto  L29064
uploadCoinDraftPhotos  L32343
uploadDraftPhoto  L35278
