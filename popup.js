// 상태 메시지 표시 함수
function showStatus(message, isSuccess = true) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${isSuccess ? 'success' : 'error'}`;
    statusEl.style.display = 'block';

    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

// 저장된 리뷰 개수 표시 함수
async function updateCount() {
    try {
        const store = await chrome.storage.local.get({ reviews: [] });
        const count = store.reviews?.length || 0;
        document.getElementById('count').innerText = count;

        // 리뷰가 있으면 미리보기 섹션 표시
        const previewSection = document.getElementById('previewSection');
        if (count > 0) {
            previewSection.classList.add('show');
            loadPreview();
        } else {
            previewSection.classList.remove('show');
        }
    } catch (error) {
        console.error('Failed to update count:', error);
    }
}

// Storage에서 리뷰 데이터 로드
async function loadReviews() {
    try {
        const store = await chrome.storage.local.get({ reviews: [] });
        return store.reviews || [];
    } catch (error) {
        console.error('Failed to load reviews:', error);
        return [];
    }
}

// 리뷰 미리보기 표시 (최근 5개)
async function loadPreview() {
    try {
        const reviews = await loadReviews();
        const previewList = document.getElementById('previewList');
        previewList.innerHTML = '';

        if (reviews.length === 0) {
            previewList.innerHTML = '<div class="preview-item">수집된 리뷰가 없습니다.</div>';
            return;
        }

        // 최근 5개만 표시
        const recentReviews = reviews.slice(-5).reverse();
        recentReviews.forEach((review, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            const textDiv = document.createElement('div');
            textDiv.className = 'preview-item-text';
            textDiv.textContent = review;
            item.appendChild(textDiv);
            previewList.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load preview:', error);
    }
}

// 전체 리뷰 목록 표시
async function displayAllReviews() {
    try {
        const reviews = await loadReviews();

        if (reviews.length === 0) {
            showStatus('표시할 리뷰가 없습니다.', false);
            return;
        }

        // 모달 생성
        let modal = document.getElementById('reviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reviewModal';
            modal.className = 'review-modal';

            const modalContent = document.createElement('div');
            modalContent.className = 'review-modal-content';

            const header = document.createElement('div');
            header.className = 'review-modal-header';
            header.innerHTML = `
                <h2>전체 리뷰 (${reviews.length}개)</h2>
                <button class="close-btn" id="closeModal" style="width: calc(100% - 3px); max-width:calc(80px - 3px);">닫기</button>
            `;

            const reviewList = document.createElement('div');
            reviewList.className = 'review-list';
            reviewList.id = 'reviewList';

            modalContent.appendChild(header);
            modalContent.appendChild(reviewList);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // 닫기 버튼 이벤트
            document.getElementById('closeModal').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            // 모달 외부 클릭 시 닫기
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // 리뷰 목록 렌더링
        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = '';

        reviews.forEach((review, index) => {
            const item = document.createElement('div');
            item.className = 'review-item';

            const indexDiv = document.createElement('div');
            indexDiv.className = 'review-item-index';
            indexDiv.textContent = `리뷰 #${index + 1}`;

            const textDiv = document.createElement('div');
            textDiv.className = 'review-item-text';
            textDiv.textContent = review;

            item.appendChild(indexDiv);
            item.appendChild(textDiv);
            reviewList.appendChild(item);
        });

        modal.style.display = 'block';
    } catch (error) {
        console.error('Failed to display reviews:', error);
        showStatus('리뷰를 표시하는 중 오류가 발생했습니다.', false);
    }
}

// 리뷰 수집 처리 함수
async function collectReviews() {
    const collectBtn = document.getElementById('collectBtn');
    collectBtn.disabled = true;
    collectBtn.textContent = '수집 중...';

    try {
        // 현재 윈도우에서 활성화된 탭을 찾음
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tabs[0]) {
            showStatus('활성 탭을 찾을 수 없습니다.', false);
            return;
        }

        // 쿠팡 페이지인지 확인
        const tabUrl = tabs[0].url || '';
        if (!tabUrl.includes('coupang.com')) {
            showStatus('쿠팡 상품 페이지에서만 사용할 수 있습니다.', false);
            return;
        }

        // 찾은 탭에 content script로 메시지 전송 (리뷰 수집 요청)
        let res;
        try {
            res = await chrome.tabs.sendMessage(tabs[0].id, {
                type: 'COLLECT_REVIEWS'
            });
        } catch (messageError) {
            // content script가 없는 경우 에러 처리
            if (messageError.message?.includes('Receiving end does not exist')) {
                showStatus('페이지를 새로고침한 후 다시 시도해주세요. (F5 키를 눌러주세요)', false);
                return;
            }
            // 다른 에러인 경우
            console.error('Message error:', messageError);
            showStatus(`연결 오류: ${messageError.message || '알 수 없는 오류'}`, false);
            return;
        }

        // 응답이 없는 경우
        if (!res) {
            showStatus('페이지에서 응답을 받을 수 없습니다. 페이지를 새로고침해주세요.', false);
            return;
        }

        // 메시지 응답이 없거나, 리뷰가 없으면 함수 종료
        if (!res?.reviews || res.reviews.length === 0) {
            showStatus('수집할 리뷰가 없습니다. 쿠팡 상품 페이지에서 시도해주세요.', false);
            return;
        }

        // chrome.storage.local에서 기존 저장된 리뷰 목록 가져옴 (없을 경우 빈 배열 사용)
        const store = await chrome.storage.local.get({ reviews: [] });

        // 기존 리뷰를 Set으로 변환 (중복 제거)
        const existingReviewsSet = new Set(store.reviews || []);

        // 새로 수집한 리뷰 중 중복되지 않는 것만 필터링
        const newReviews = res.reviews.filter(review => !existingReviewsSet.has(review));
        const addedCount = newReviews.length;

        if (addedCount > 0) {
            // 중복 제거된 리뷰 배열 생성
            const merged = [...existingReviewsSet, ...newReviews];

            // 합쳐진 리뷰 배열을 storage에 다시 저장
            await chrome.storage.local.set({ reviews: merged });

            // 현재까지 저장된 리뷰 개수를 화면에 표시 및 미리보기 업데이트
            await updateCount();

            showStatus(`${addedCount}개의 새 리뷰를 수집했습니다!`, true);
        } else {
            showStatus('새로운 리뷰가 없습니다. (이미 수집된 리뷰입니다)', false);
        }
    } catch (error) {
        console.error('Failed to collect reviews:', error);
        showStatus('리뷰 수집 중 오류가 발생했습니다.', false);
    } finally {
        collectBtn.disabled = false;
        collectBtn.textContent = '리뷰 수집';
    }
}

// JSON 형식으로 내보내기
async function exportToJSON() {
    try {
        const reviews = await loadReviews();

        if (reviews.length === 0) {
            showStatus('내보낼 리뷰가 없습니다.', false);
            return;
        }

        // 리뷰 배열을 인덱스와 함께 구조화된 객체 배열로 변환
        const structuredReviews = reviews.map((text, index) => ({
            index: index + 1,
            text: text
        }));

        const data = {
            exportDate: new Date().toISOString(),
            totalCount: reviews.length,
            reviews: structuredReviews
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `coupang-reviews-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showStatus('JSON 파일로 내보내기가 완료되었습니다!', true);
    } catch (error) {
        console.error('Failed to export JSON:', error);
        showStatus('JSON 내보내기 중 오류가 발생했습니다.', false);
    }
}

// CSV 형식으로 내보내기
async function exportToCSV() {
    try {
        const reviews = await loadReviews();

        if (reviews.length === 0) {
            showStatus('내보낼 리뷰가 없습니다.', false);
            return;
        }

        // CSV 헤더
        let csvContent = '번호,리뷰 내용\n';

        // 리뷰 데이터 추가 (CSV 이스케이프 처리)
        reviews.forEach((review, index) => {
            // 따옴표와 줄바꿈 처리
            const escapedReview = review
                .replaceAll('"', '""')  // 따옴표 이스케이프
                .replaceAll('\n', ' ')   // 줄바꿈을 공백으로
                .replaceAll('\r', '');   // 캐리지 리턴 제거

            csvContent += `${index + 1},"${escapedReview}"\n`;
        });

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `coupang-reviews-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showStatus('CSV 파일로 내보내기가 완료되었습니다!', true);
    } catch (error) {
        console.error('Failed to export CSV:', error);
        showStatus('CSV 내보내기 중 오류가 발생했습니다.', false);
    }
}

// 모든 데이터 삭제
async function clearAllData() {
    try {
        const reviews = await loadReviews();

        if (reviews.length === 0) {
            showStatus('삭제할 데이터가 없습니다.', false);
            return;
        }

        // 확인 메시지
        if (!confirm(`정말로 모든 리뷰 데이터 (${reviews.length}개)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        await chrome.storage.local.set({ reviews: [] });
        await updateCount();
        showStatus('모든 데이터가 삭제되었습니다.', true);
    } catch (error) {
        console.error('Failed to clear data:', error);
        showStatus('데이터 삭제 중 오류가 발생했습니다.', false);
    }
}

// 페이지 로드 시 저장된 리뷰 개수 표시
document.addEventListener('DOMContentLoaded', () => {
    updateCount();

    // 버튼 이벤트 리스너 등록
    document.getElementById('collectBtn').addEventListener('click', collectReviews);
    document.getElementById('viewAllBtn').addEventListener('click', displayAllReviews);
    document.getElementById('exportJsonBtn').addEventListener('click', exportToJSON);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);

    // 미리보기 토글 버튼
    const toggleBtn = document.getElementById('togglePreview');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const previewList = document.getElementById('previewList');
            const isHidden = previewList.style.display === 'none';
            previewList.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '접기' : '펼치기';
        });
    }
});
