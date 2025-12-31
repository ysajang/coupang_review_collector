// 현재 화면에 보이는 리뷰 본문을 수집하는 함수
function collectReviews() {
    // 리뷰 텍스트가 들어있는 span 요소들을 모두 선택
    const nodes = document.querySelectorAll(
        '#sdpReview article div.twc-break-all > span'
    );

    // 선택한 요소들에서 텍스트만 추출하고, 공백만 있는 경우는 제외
    const reviews = Array.from(nodes)
        .map(el => el.innerText.trim())     // 각 span의 텍스트 값을 trim()으로 앞뒤 공백을 제거하여 추출
        .filter(text => text.length > 0);   // 텍스트 길이가 0보다 큰 것만 남김 (즉, 빈 텍스트 제거)

    // 수집된 리뷰 텍스트 배열 반환
    return reviews;
}

// popup에서 메시지를 받으면 실행되는 리스너 등록
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    // 메시지 타입이 'COLLECT_REVIEWS'일 때만 실행
    if (req.type === 'COLLECT_REVIEWS') {
        try {
            // 리뷰를 수집
            const data = collectReviews();
            // 수집한 리뷰 데이터를 응답으로 반환
            sendResponse({ reviews: data });
        } catch (error) {
            console.error('Error collecting reviews:', error);
            sendResponse({ reviews: [], error: error.message });
        }
        // 비동기 응답을 위해 true 반환 (필수)
        return true;
    }
    return false;
});
