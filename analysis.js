// 리뷰 데이터 분석 유틸리티 함수들

/**
 * 수집된 리뷰 데이터를 분석하는 함수
 * @param {Array<string>} reviews - 분석할 리뷰 배열
 * @returns {Object} 분석 결과 객체
 */
function analyzeReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        return {
            totalCount: 0,
            averageLength: 0,
            wordFrequency: {},
            sentiment: null
        };
    }

    // 전체 리뷰 개수
    const totalCount = reviews.length;

    // 평균 리뷰 길이 계산
    const totalLength = reviews.reduce((sum, review) => sum + review.length, 0);
    const averageLength = Math.round(totalLength / totalCount);

    // 단어 빈도 분석 (간단한 버전)
    const wordFrequency = {};
    reviews.forEach(review => {
        const words = review.split(/\s+/).filter(word => word.length > 1);
        words.forEach(word => {
            const normalizedWord = word.toLowerCase().replaceAll(/[^\w가-힣]/g, '');
            if (normalizedWord) {
                wordFrequency[normalizedWord] = (wordFrequency[normalizedWord] || 0) + 1;
            }
        });
    });

    // 상위 10개 단어 추출
    const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

    return {
        totalCount,
        averageLength,
        wordFrequency,
        topWords,
        sentiment: null // 향후 감성 분석 기능 추가 가능
    };
}

/**
 * Chrome Storage에서 리뷰를 가져와 분석하는 함수
 * @returns {Promise<Object>} 분석 결과
 */
async function analyzeStoredReviews() {
    try {
        const store = await chrome.storage.local.get({ reviews: [] });
        const reviews = store.reviews || [];
        return analyzeReviews(reviews);
    } catch (error) {
        console.error('Failed to analyze reviews:', error);
        throw error;
    }
}

// Chrome Extension API를 사용할 수 있는 환경에서만 export
if (typeof chrome !== 'undefined' && chrome.storage) {
    // Background script나 popup에서 사용 가능
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { analyzeReviews, analyzeStoredReviews };
    }
}
