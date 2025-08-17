const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const router = express.Router();

// AI 백엔드 서버 주소 (Docker 포트 매핑: 62000 → 8001)
const aiApiUrl = 'http://127.0.0.1:62000';

// AI 서버 연결 상태 추적
let aiServerStatus = {
    isConnected: false,
    lastCheckTime: null,
    lastErrorTime: null,
    consecutiveFailures: 0
};

// AI 서버 헬스 체크 함수
async function checkAIServerHealth() {
    try {
        const response = await axios.get(`${aiApiUrl}/health`, {
            timeout: 5000 // 5초 타임아웃
        });
        
        if (response.status === 200) {
            aiServerStatus.isConnected = true;
            aiServerStatus.lastCheckTime = new Date();
            aiServerStatus.consecutiveFailures = 0;
            console.log(`[LLM Health Check] AI 서버 정상 연결됨`);
            return true;
        }
    } catch (error) {
        aiServerStatus.isConnected = false;
        aiServerStatus.lastErrorTime = new Date();
        aiServerStatus.consecutiveFailures++;
        console.log(`[LLM Health Check] AI 서버 연결 실패 (연속 ${aiServerStatus.consecutiveFailures}회)`);
        return false;
    }
}

// 주기적 헬스 체크 (30초마다)
setInterval(checkAIServerHealth, 30000);

// 초기 헬스 체크
checkAIServerHealth();

console.log(`[LLM Manual Proxy] AI 백엔드 서버 URL: ${aiApiUrl}`);

// multer 설정 - 메모리 스토리지 사용
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 제한
    }
});

// AI 서버 상태 확인 엔드포인트
router.get('/ai-status', (req, res) => {
    res.json({
        connected: aiServerStatus.isConnected,
        lastCheck: aiServerStatus.lastCheckTime,
        lastError: aiServerStatus.lastErrorTime,
        consecutiveFailures: aiServerStatus.consecutiveFailures,
        serverUrl: aiApiUrl
    });
});

// 수동 AI 서버 헬스 체크 엔드포인트
router.get('/check-ai-health', async (req, res) => {
    const isHealthy = await checkAIServerHealth();
    res.json({
        healthy: isHealthy,
        status: aiServerStatus
    });
});

// 이미지 채팅 엔드포인트
router.post('/image-chat', upload.single('image'), async (req, res) => {
    console.log(`[LLM Manual Proxy] 이미지 채팅 요청 수신`);
    
    // AI 서버 연결 상태 확인
    if (!aiServerStatus.isConnected) {
        console.log('[LLM Manual Proxy] AI 서버가 연결되지 않았습니다.');
        return res.status(503).json({
            error: 'AI 서비스를 일시적으로 사용할 수 없습니다.',
            detail: 'AI 서버가 시작 중이거나 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.',
            serverStatus: aiServerStatus
        });
    }
    
    try {
        // FormData 생성
        const formData = new FormData();
        
        // 텍스트 데이터 추가
        formData.append('sessionId', req.body.sessionId || '');
        formData.append('message', req.body.message || '');
        formData.append('pageInfo', req.body.pageInfo || '{}');
        
        // 이미지 파일 추가
        if (req.file) {
            formData.append('image', req.file.buffer, {
                filename: req.file.originalname || 'image.jpg',
                contentType: req.file.mimetype || 'image/jpeg'
            });
            
            console.log(`[LLM Manual Proxy] 이미지 정보:`, {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }
        
        const targetUrl = `${aiApiUrl}/image-chat`;
        console.log(`[LLM Manual Proxy] 이미지 채팅 요청 전달: ${targetUrl}`);
        
        const response = await axios.post(targetUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'host': '127.0.0.1:62000'
            },
            timeout: 120000 // 2분 타임아웃 (이미지 처리 시간 고려)
        });
        
        console.log(`[LLM Manual Proxy] 이미지 채팅 응답: ${response.status}`);
        res.status(response.status).json(response.data);
        
    } catch (error) {
        console.error('[LLM Manual Proxy] 이미지 채팅 오류:', error.message);
        
        // 연결 실패 시 상태 업데이트
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
            aiServerStatus.isConnected = false;
            aiServerStatus.lastErrorTime = new Date();
            aiServerStatus.consecutiveFailures++;
        }
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
            res.status(503).json({ 
                error: 'AI 서비스에 연결할 수 없습니다.',
                detail: '서버가 시작 중이거나 일시적으로 사용할 수 없습니다.',
                serverStatus: aiServerStatus
            });
        } else {
            res.status(500).json({ 
                error: '이미지 처리 중 오류가 발생했습니다.',
                detail: error.message 
            });
        }
    }
});

// STT 엔드포인트 제거

// 기본 프록시 미들웨어 (다른 모든 요청 처리)
router.use('/', async (req, res) => {
    // /api/llm 접두사를 제거하고 실제 엔드포인트 경로만 사용
    const originalPath = req.originalUrl.replace('/api/llm', '');
    const targetUrl = `${aiApiUrl}${originalPath}`;

    console.log(`[LLM Manual Proxy] 요청 수신: ${req.method} ${req.originalUrl}`);
    
    // keep-alive ping 요청 처리 (AI 서버 상태와 관계없이 응답)
    if (req.body && req.body.message === 'ping' && req.body.pageInfo?.type === 'keep-alive') {
        console.log('[LLM Manual Proxy] Keep-alive ping 요청 처리');
        return res.json({
            message: 'pong',
            aiServerConnected: aiServerStatus.isConnected,
            timestamp: new Date().toISOString()
        });
    }
    
    // AI 서버 연결 상태 확인 (일반 요청에 대해)
    if (!aiServerStatus.isConnected) {
        console.log('[LLM Manual Proxy] AI 서버가 연결되지 않았습니다.');
        return res.status(503).json({
            error: 'AI 서비스를 일시적으로 사용할 수 없습니다.',
            detail: 'AI 서버가 시작 중이거나 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.',
            serverStatus: aiServerStatus
        });
    }
    
    console.log(`[LLM Manual Proxy] 대상 URL로 전달 시도: ${targetUrl}`);

    try {
        const headers = { ...req.headers };
        // 프록시 요청을 위해 호스트 헤더를 대상에 맞게 변경
        headers.host = '127.0.0.1:62000';      
        // Express에서 추가하는 기타 관련 헤더 제거
        delete headers['connection'];
        delete headers['content-length']; // Content-Length는 axios가 자동으로 설정하도록 함

        // axios 요청 옵션 구성
        const axiosOptions = {
            method: req.method.toLowerCase(),
            url: targetUrl,
            headers: headers,
            timeout: 90000, // 90초 타임아웃 (LLM 응답 대기 시간 고려)
            validateStatus: () => true, // 모든 상태 코드 허용
            transformResponse: [(data) => data], // 자동 JSON 파싱 비활성화
        };

        // TTS 관련 설정 제거

        // 요청 본문 처리
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            // JSON 요청의 경우
            if (req.is('application/json')) {
                axiosOptions.data = req.body;
                // Content-Type이 없으면 추가
                if (!headers['content-type']) {
                    headers['content-type'] = 'application/json';
                }
            }
            // 기타 형식의 요청(텍스트 등)
            else {
                axiosOptions.data = req.body;
            }
        }

        console.log(`[LLM Manual Proxy] 요청 본문 타입: ${typeof axiosOptions.data}`);
        if (axiosOptions.data) {
            console.log(`[LLM Manual Proxy] 요청 본문:`, JSON.stringify(axiosOptions.data).substring(0, 200));
        }

        const response = await axios(axiosOptions);

        console.log(`[LLM Manual Proxy] 응답 수신: ${response.status} ${response.statusText}`);
        console.log(`[LLM Manual Proxy] 응답 헤더:`, response.headers);
        
        // Raw 응답 확인
        if (response.headers['content-type']?.includes('application/json')) {
            console.log(`[LLM Manual Proxy] Raw 응답 타입:`, typeof response.data);
            if (typeof response.data === 'string') {
                console.log(`[LLM Manual Proxy] Raw 문자열 길이:`, response.data.length);
                console.log(`[LLM Manual Proxy] Raw 문자열 앞 200자:`, response.data.substring(0, 200));
            }
        }

        // 응답 헤더 복사
        res.statusCode = response.status;
        for (const [key, value] of Object.entries(response.headers)) {
            // 일부 헤더는 Express가 자동으로 처리하므로 제외
            if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        }

        // 응답 본문 처리
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            // JSON 응답인 경우
            try {
                // 응답을 문자열로 변환
                const jsonString = typeof response.data === 'string' 
                    ? response.data 
                    : response.data.toString('utf8');
                
                console.log(`[LLM Manual Proxy] Raw JSON 문자열 앞 300자:`, jsonString.substring(0, 300));
                
                // JSON 파싱
                const jsonData = JSON.parse(jsonString);
                    
                console.log(`[LLM Manual Proxy] 응답 데이터 타입: object (JSON)`);
                // JSON.stringify는 줄바꿈을 제거하므로 실제 메시지 확인
                if (jsonData.message) {
                    console.log(`[LLM Manual Proxy] 메시지 길이:`, jsonData.message.length);
                    console.log(`[LLM Manual Proxy] 실제 줄바꿈 포함:`, jsonData.message.includes('\n'));
                    console.log(`[LLM Manual Proxy] 메시지 첫 100자:`, jsonData.message.substring(0, 100));
                } else {
                    console.log(`[LLM Manual Proxy] 응답 데이터:`, JSON.stringify(jsonData).substring(0, 200));
                }
                res.json(jsonData);
            } catch (e) {
                console.error('[LLM Manual Proxy] JSON 파싱 오류:', e);
                res.send(response.data);
            }
        } else if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
            // 오디오 또는 바이너리 응답인 경우
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: binary (${contentType})`);
            console.log(`[LLM Manual Proxy] 응답 데이터 크기: ${response.data.length} bytes`);
            res.send(Buffer.from(response.data));
        } else if (contentType.includes('text/')) {
            // 텍스트 응답인 경우
            const textData = axiosOptions.responseType === 'arraybuffer'
                ? response.data.toString('utf8')
                : response.data;
                
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: string (${contentType})`);
            console.log(`[LLM Manual Proxy] 응답 데이터:`, textData.substring(0, 200));
            res.send(textData);
        } else {
            // 기타 응답
            console.log(`[LLM Manual Proxy] 응답 데이터 타입: unknown (${contentType})`);
            if (axiosOptions.responseType === 'arraybuffer') {
                console.log(`[LLM Manual Proxy] 응답 데이터 크기: ${response.data.length} bytes`);
                res.send(Buffer.from(response.data));
            } else {
                res.send(response.data);
            }
        }

    } catch (error) {
        console.error('[LLM Manual Proxy] 프록시 요청 중 오류 발생:', error.message);
        
        // 연결 실패 시 상태 업데이트
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            aiServerStatus.isConnected = false;
            aiServerStatus.lastErrorTime = new Date();
            aiServerStatus.consecutiveFailures++;
            
            // 즉시 재연결 시도
            setTimeout(checkAIServerHealth, 1000);
        }
        
        if (error.response) {
            // axios 응답 오류
            console.error('[LLM Manual Proxy] 응답 오류:', error.response.status);
            res.status(error.response.status).json({
                error: 'AI 백엔드 서버 응답 오류',
                status: error.response.status,
                message: error.response.data
            });
        } else if (error.request) {
            // 요청 오류 (네트워크 등)
            console.error('[LLM Manual Proxy] 요청 오류:', error.code);
            res.status(503).json({
                error: 'AI 백엔드 서버 연결 실패',
                message: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
                serverStatus: aiServerStatus
            });
        } else {
            // 기타 오류
            console.error('[LLM Manual Proxy] 기타 오류:', error.message);
            res.status(500).json({
                error: 'AI 백엔드 서버 통신 오류',
                message: error.message
            });
        }
    }
});

module.exports = router; 