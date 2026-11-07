# Code map: app.html, function -> line (generated)

`app.html` is 38,010 lines. Generated from `406fed8` (the last code commit of `claude/device-cache-ao`, (ao), fast-forwarded to main 7 Nov 2026; the merge's docs commit does not touch `app.html`) by the script below; **line numbers drift with every code change**, so regenerate after each code merge (CLAUDE.md, end-of-work rule 5) and trust a grep over a stale number. Never read app.html whole: find the area here, then view only that range.

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
L5485  REAL-GRAPH FEATURE FLAGS + THE ONE SHARED MSAL INSTANCE
L6010  STORED PHOTOS / RECEIPTS
L6012  THE PHOTOS AND RECEIPTS TABS ARE THE ONLY RECORD
L6373  LIVE NAV DATA
L9052  ONEDRIVE WRITE LAYER + COLLECTIONID RESERVATION + ADD SET
L9706  BROWSE EDIT WRITE LAYER
L10673  COINID RE-LINKING ON IDENTITY EDIT
L11054  SET ATTACH / DETACH — A
L11265  PHOTOS / RECEIPTS TABLE WRITE LAYER
L11723  PURGE
L12082  CONTAINERS READ-LAYER JOIN
L12159  WRITE-LAYER GUARD DIALOGS
L12560  ADD COIN
L12864  ADD COIN PHASE 2
L13417  DOCKET RESEARCH QUEUE
L13791  FAKE DATA
L14075  PHOTO GALLERY & CROP PIPELINE
L15587  SECTION LOADING INDICATOR
L15623  SHARING
L15656  DASHBOARD
L19054  RECORD ACCORDIONS
L19503  BROWSE DETAIL — EDIT
L21855  ALBUMS
L23318  WISHLIST
L23484  NEEDS ATTENTION
L24263  STAGING REVIEW — P
L25256  STATS & VALUE
L25380  LEDGER: MANUAL SPOT-PRICE UPDATE (R
L26266  FORMER HOLDINGS
L26727  RECEIPT
L26960  COMMIT A CAPTURED RECEIPT
L27796  PHOTO CROP ADJUSTER
L28018  STAGE 1 — BACKGROUND CROP
L28302  CROP PIPELINE ORCHESTRATOR
L28381  COMMIT A CAPTURED PHOTO
L28564  STORED PHOTOS IN THE CAPTURE UI
L28651  PHOTO LABELS SAVE WITH SAVE CHANGES (O
L29258  PHOTOS WAIT FOR SAVE (O
L29667  CROP FROM AN UPLOADED PHOTO
L30174  GALLERY CAPTURE WIDGET
L30294  SUB-GROUP PHOTO SHEET
L30321  DRAFT MODE (A
L30646  ADD SET
L30797  ADD SET STEP 2
L30866  MANAGE PHOTOS
L31529  GALLERY DISPLAY
L31628  IN-APP MEDIA VIEWER
L32580  FILES PICKER + PHOTO GUARD (A
L32615  UNIFIED IMAGE CHOOSER (O
L32682  PHOTO SLOTS
L32809  ADD COIN
L32841  GRADE PICKER
L32910  DESCRIPTION AUTO-FILL
L33430  DESCRIPTION CONSISTENCY GATE (A
L33620  PCGS LABEL AUTO-POPULATE
L34225  DIRECT-WRITE
L34571  ADD COIN SAVE — P
L35098  EDITING AN EXISTING STAGING DRAFT (P
L35337  EDITING A STAGING DRAFT — PHOTOS AND THE RECEIPT (P
L36187  YEAR PICKER
L36639  ADD SET
<!-- regions:end -->

## Add Coin / Edit Coin forms

mapWorkbookRowToDbCoin  L8249
activeCoins  L8567
isExitStatus  L9828
ownedCoins  L9841
buildCoinDraft  L12626
coinDraftToAllValues  L12948
compositionLabelCandidates  L17052
setFittedCornerText  L17072
roundToCents  L20613
valueWithFaceFloor  L20655
refreshVarietyOptions  L33397
applyDbCoinsRowToForm  L33721
readAddCoinFormForDraft  L34450
refreshAddCoinCategoryUI  L15136
addCoinDirectSaveGaps  L34260
addCoinMatchResolved  L34293
addCoinGateMessage  L34282
saveCoinDraftEdit  L34784
resetAddCoinForm  L34965
applyCoinDraftToForm  L35162

## Add Coin write layer, Staging drafts, Promote

buildRowCellEdits  L10423
saveCoinRowToWorkbook  L10600
writeCoinIdCell  L10743
setDraftFolder  L12410
coinDraftFolder  L12595
setFlipPhotoUrl  L14378
readBrowseEditForm  L20874
checkDesignationReresolution  L21747
collectionIdNumber  L24280
renderStagingList  L24319
promoteStagedCoin  L24639
rejectStagedCoin  L25205
findDbCoinsMatch  L33065
isVarietyRecognized  L33424
renderAmbiguousMatchList  L33841
isConfidentMatch  L34266
coinDraftPromoteGaps  L13158
allRowHoldsCoinDraft  L13181
coinOnLoadedAllSheet  L12787
coinDraftStaleOnAll  L12799
markCoinDraftAlreadyPromoted  L24773
finishCoinDraftWrite  L24719

## Add Set

getWriteToken  L9092
reservationIdNumber  L12342
addChildToSetDraft  L12520
plannedPromotionMoves  L13709
matchDbSetsByProductCode  L36730
dbSetTypeName  L36748
composeSetName  L36764
categoryFromLineage  L36804
readAddSetYear  L37271
resumeSetDraftAtStep1  L37394
startSetCapture  L37528
allSubGroupsFull  L37640
renderChildStep  L37646
readChildFormValues  L37754
restoreChildFormValues  L37769
saveCurrentChild  L37817

## Albums

mapWorkbookRowToDbSet  L8039
buildLiveAlbums  L8178
activeDbCoins  L8569
activeAlbums  L8661
setBrowseStepContext  L17533
resolveCoinAlbumLink  L18892
renderAlbumsList  L22078
initAlbums  L22133
computeAlbumPageRows  L22242
openAlbumAtPage  L22401
showAlbumDetail  L22486
slotMintage  L22517
formatAlbumMintage  L22538
renderSlotCell  L22742
turnAlbumPage  L23048
renderAlbumBook  L23145

## All-sheet write layer (Browse Edit, new rows, Set link, dates)
headerMapFromTableHeader  L10190
ensureAllHeaderMap  L10208
ensureSheetHeaderMap  L11341
missingWriteColumns  L10226
assertNoFormulaCells  L10258
readAllRowForWrite  L10341
batchWriteError  L10147
partialSaveResult  L10500

refreshLiveCoinsAfterWrite  L9046
__setBrowseEditWriteEnabledForTest  L9938
excelSerialToday  L9989
workbookDateToday  L10028
localISODateToday  L10071
toWorkbookDate  L10078
__resetAllHeaderMapForTest  L10269
findAllSheetRowNumber  L10273
detectIdentityOverwrites  L10403
createAllSheetRow  L10960
writeOriginSetIdCell  L11132
writeRecordRow  L11430
resolveStorageLocation  L12139
showWriteGuard  L12166
promoteCoinDraftToAllSheetUnlocked  L13223
forceAddCoinDraft  L24875

## Auth, Graph reads, flags, OneDrive paths

acquireGraphToken  L5870
getReferenceImageToken  L5923
fetchReferenceImageBlob  L5955
ensureReferenceImageFetch  L5986
__setSplashTimingsForTest  L6500
noteRetryAfter  L6530
abortStartupRequests  L6577
withRequestTimeout  L6584
refetchMissingLiveNavSheets  L8518
liveDataMode  L8634
saveDocketQueue  L13582
hasReferenceImage  L15874
applyRealReferenceImage  L16017

## Browse detail, Edit Set, sharing

resolveCoinSpecs  L8747
graph  L9664
loadDocketQueue  L13518
galleryFlipEntry  L14361
buildCertLookupUrl  L14630
spotlightCoinList  L15755
applyDiscContent  L15931
originSetIdKeysMatch  L18579
setChildrenFor  L18584
compositionTextFor  L18862
resolveChildParentSet  L18972
renderDetailAccordions  L19127
buildSetChildRow  L19796
catalogFunFactFor  L20373
formatCurrency  L20634
renderStats  L26014

## Catalog, Sets tab, Rolls, live-nav data

colVal  L7815
buildLookupCategoryList  L8470
activeDbSets  L8568
coinMatchesSearchQuery  L16787
metalCategoryFor  L16959
coinsTabBaseRows  L17776
medalTabBaseRows  L17789
applyCoinsTabFilters  L17813
applySetsTabFilters  L17840
renderSetChecklist  L17864
rollYearNumber  L17921
applyRollsTabFilters  L17968
resetBrowseFilters  L18025
showBrowseTab  L18073
detailTitleText  L18706
ownedSetForSetId  L36882
applyAddSetContext  L37482

## CoinID matcher

activeLookupGraders  L8570
knownDbCoinsFinishValues  L21437
dbCoinsCandidatesFor  L21452
docketRecheckEntry  L23634
runWithButtonPending  L24675
promoteCoinDraft  L24828
recheckCoinDraftMatch  L25028
lookupDescriptionCandidates  L32972
normField  L33043
addCoinIdentityShape  L33082
currentAddCoinMatchState  L33141
checkDbCoinsMatch  L33167
resolveAddCoinCatalogMatch  L33279
parsePcgsLabel  L33650
updateSaveConfidenceUI  L34314
completeAddCoinSave  L34606

## Dashboard, navigation, splash, startup

ensureLiveNavDataFetch  L8792
coinDetailsFor  L14007
setNavBack  L15327
navigate  L15389
initCabinet  L15683
updateDocketFob  L15716
resetSpotlightTimer  L16701
browseMetalTest  L17393
sortRollRows  L17934
rollsMetalTest  L17960
armLeaveGuard  L29020
mintMarkOtherSelected  L33994
selectMintMarkOther  L33998
buildSplashDiagnosticText  L36352
runSplashConnect  L36389
docketQueueReady  L36466

## Docket, Needs Attention, Staging Review

getCachedWorkbookWebUrl  L9674
__resetWorkbookWebUrlCacheForTest  L9683
getCachedFolderWebUrl  L9693
flagCoinIdNeedsRelink  L12062
listSetDrafts  L12503
dismissSetDraftGap  L12552
buildDocketEntry  L13609
docketOpenEntries  L13642
appendDocketEntry  L13652
coinMissingPhoto  L16826
wireStaticAccordionToggle  L20522
performBrowseEditWrite  L21112
renderNeedsAttentionHub  L23784
appendDocketRows  L24162
buildCoinRecordFromForm  L34426

## Flip card and corner labels

mapWorkbookRowToCoin  L7849
wireSideToggle  L15993
renderCornerLines  L16036
wrapTextToTwoLines  L16059
renderFittedCornerLines  L16121
renderTypeDenomCorner  L16333
gradeDesignationCornerText  L16482
applyFlipCorners  L16495
cornerClearsDisc  L17176
shrinkCornerToFit  L17236
setCompositionCornerText  L17339
renderBrowseGrid  L17535
toggleBrowseDetailSide  L18521
showBrowseDetail  L18714
isSetRow  L18908
escapeHtmlText  L26767

## Former Holdings and Purge

formerHoldings  L9877
writePurgedCell  L11165
patchRecordRow  L11463
readRecordRows  L11504
buildPhotoRowPatch  L11684
clearPhotoRowField  L11701
purgeablePhotosFor  L11757
fileRowsForPhotos  L11798
finalisePurgedFlag  L11855
purgeCoinPhotos  L11894
activeYearFilterState  L17720
yearRowTestAgainst  L17728
updateActiveYearFilterButtonUI  L17753
applyAfterYearFilterChange  L17757
browseStepListFallback  L18612
renderFormerHoldings  L26384

## Ledger, Stats, spot prices, Wishlist

statusSelectDisplayValue  L9899
setSelectValuePreservingUnknown  L19976
coinValueFigure  L20678
ensureSpotPricesForMeltLabels  L20733
loadSpotPrices  L25282
renderSpotPrices  L25339
refreshLedgerValueTiles  L26131

## Photos, crop, image chooser, receipts and the save-wait rules

writeReceiptRow  L11979
recordPromotedCoinRecords  L13096
seriesLabel  L15822
sanitizeSeriesName  L15853
referenceSeriesKey  L15857
showBrowseEditSetView  L20395
commitReceiptCapture  L27125
photoCommitTargetId  L28409
unsavedEditsForView  L28814
refreshEditSaveState  L28958
buildPhotoPairSlot  L30434
manageOpenEndedBlock  L30994
renderManagePhotos  L31173
renderManagePhotosInto  L31190
uploadCoinDraftPhotos  L34526
uploadDraftPhoto  L37521

## Device cache, read-only gate, load report, recent writes ((ao), merged 7 Nov 2026)

applyLiveNavSheetRows  L8945
checkSessionAgainstWorkbook  L7195
checkWorkbookVersion  L6837
deleteWorkbookCacheForWrite  L7542
fetchWorkbookSheetRows  L6610
fetchWorkbookVersion  L6791
finishCoinRowSave  L10589
fullReadVersionTrusted  L7267
gatedGraphClient  L7123
hashSheetValues  L7275
idbOpenCache  L7490
isMsalNetworkError  L7403
launchFromSavedCopy  L7632
loadWorkbookCacheRecord  L7596
noteFullReadReport  L6737
noteRecentRowWrite  L10548
noteSaveOutcome  L10573
onFullReadLanded  L7287
recordWorkbookVersionCheck  L6821
refreshSessionFromWorkbook  L7242
renderDocketDataLine  L7704
renderLagProbe  L7787
renderLoadReport  L6894
renderSessionState  L7358
rowsFromSheetValues  L6671
saveWorkbookCacheAfterRead  L7549
setConnectionTrouble  L7168
settleSavedCopyVersion  L7660
startLagProbe  L7755
tokenFailureAction  L7413
whenWritesAllowed  L7326
withRecentWrites  L10559
withSaveTiming  L7006
workbookSessionChecked  L7081
workbookWritesAllowed  L7085
