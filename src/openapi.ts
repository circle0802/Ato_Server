export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Ato Server API",
    version: "0.1.0",
    description: "아토 앱의 로그인, 기념일, 선물 추천, 축하 메시지, 알림, 마이페이지 API입니다.",
  },
  servers: [
    {
      url: "http://127.0.0.1:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Anniversaries" },
    { name: "Gifts" },
    { name: "Messages" },
    { name: "Notifications" },
    { name: "Me" },
    { name: "AI" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "서버 상태 확인",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/nickname-check": {
      get: {
        tags: ["Auth"],
        summary: "별명 중복 확인",
        parameters: [
          {
            name: "nickname",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 2, maxLength: 20 },
          },
        ],
        responses: {
          "200": {
            description: "사용 가능 여부",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NicknameCheckResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
        },
      },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "회원가입",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "회원가입 성공",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "로그인",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "로그인 성공",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/anniversaries": {
      get: {
        tags: ["Anniversaries"],
        summary: "기념일 목록 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["date", "dday"], default: "dday" },
          },
        ],
        responses: {
          "200": {
            description: "기념일 목록",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnniversaryListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Anniversaries"],
        summary: "기념일 추가",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnniversaryInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "생성된 기념일",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnniversaryResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/anniversaries/upcoming": {
      get: {
        tags: ["Anniversaries"],
        summary: "다가오는 기념일 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 5 },
          },
        ],
        responses: {
          "200": {
            description: "다가오는 기념일 목록",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnniversaryListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/anniversaries/nearest": {
      get: {
        tags: ["Anniversaries"],
        summary: "메인 화면용 가장 가까운 기념일 조회",
        description: "지난 단발성 기념일은 제외하고 오늘 이후 가장 가까운 기념일 1개를 반환합니다.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "가장 가까운 기념일",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NearestAnniversaryResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/anniversaries/calendar": {
      get: {
        tags: ["Anniversaries"],
        summary: "월별 캘린더 기념일 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } },
          { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: {
          "200": {
            description: "월별 기념일",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CalendarResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/anniversaries/{id}": {
      get: {
        tags: ["Anniversaries"],
        summary: "기념일 상세 조회",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          "200": {
            description: "기념일 상세",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnniversaryResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Anniversaries"],
        summary: "기념일 수정",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnniversaryUpdateInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "수정된 기념일",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnniversaryResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Anniversaries"],
        summary: "기념일 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          "204": { description: "삭제 완료" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/gifts/recommendations": {
      post: {
        tags: ["Gifts"],
        summary: "AI 선물 추천 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GiftInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "추천 결과",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GiftRecommendationResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Gifts"],
        summary: "선물 추천 결과 목록 조회",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["createdAt", "price", "ranking"], default: "createdAt" },
          },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "추천 결과 목록",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GiftRecommendationListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/gifts/recommendations/{id}": {
      get: {
        tags: ["Gifts"],
        summary: "선물 추천 결과 상세 조회",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          "200": {
            description: "추천 결과 상세",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GiftRecommendationResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/gifts/recommendations/{id}/items/{itemId}": {
      patch: {
        tags: ["Gifts"],
        summary: "추천 선물 저장 상태 변경",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/IdPath" },
          { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["saved"],
                properties: { saved: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "변경된 추천 결과",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GiftRecommendationResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/messages/generate": {
      post: {
        tags: ["Messages"],
        summary: "AI 축하 메시지 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MessageGenerateInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "생성된 메시지",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/messages": {
      get: {
        tags: ["Messages"],
        summary: "메시지 목록 조회",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "favorite", in: "query", schema: { type: "boolean" } }],
        responses: {
          "200": {
            description: "메시지 목록",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/messages/{id}": {
      patch: {
        tags: ["Messages"],
        summary: "메시지 수정 또는 즐겨찾기 변경",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MessageUpdateInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "수정된 메시지",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Messages"],
        summary: "메시지 삭제",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          "204": { description: "삭제 완료" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/notifications/settings": {
      get: {
        tags: ["Notifications"],
        summary: "알림 설정 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "알림 설정",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationSettingsResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Notifications"],
        summary: "알림 설정 변경",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["notificationEnabled"],
                properties: { notificationEnabled: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "변경된 알림 설정",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationSettingsResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "예정 알림 목록 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "예정 알림 목록",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Me"],
        summary: "내 프로필 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "내 프로필",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Me"],
        summary: "내 프로필 수정",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserUpdateInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "수정된 프로필",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        tags: ["Me"],
        summary: "회원탈퇴",
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "탈퇴 완료" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/me/saved-gifts": {
      get: {
        tags: ["Me"],
        summary: "저장한 추천 선물 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "저장한 추천 선물",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SavedGiftListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/me/favorite-messages": {
      get: {
        tags: ["Me"],
        summary: "즐겨찾기 메시지 조회",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "즐겨찾기 메시지",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/ai/chat": {
      post: {
        tags: ["AI"],
        summary: "일반 Claude 채팅",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string", minLength: 1, maxLength: 4000 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI 응답",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: { text: { type: "string" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Ato HMAC token",
      },
    },
    parameters: {
      IdPath: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    responses: {
      InvalidRequest: {
        description: "요청 값이 올바르지 않음",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      Unauthorized: {
        description: "인증 실패",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      NotFound: {
        description: "리소스를 찾을 수 없음",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      Conflict: {
        description: "중복 또는 충돌",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          details: { type: "array", items: { type: "object" } },
        },
      },
      HealthResponse: {
        type: "object",
        required: ["ok"],
        properties: { ok: { type: "boolean", example: true } },
      },
      User: {
        type: "object",
        required: ["id", "nickname"],
        properties: {
          id: { type: "string", format: "uuid" },
          nickname: { type: "string", example: "ato" },
          profileImageUrl: { type: "string", nullable: true, example: null },
          notificationEnabled: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthRequest: {
        type: "object",
        required: ["nickname", "password"],
        properties: {
          nickname: { type: "string", minLength: 2, maxLength: 20, example: "ato" },
          password: { type: "string", minLength: 8, maxLength: 72, example: "password123" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      NicknameCheckResponse: {
        type: "object",
        required: ["nickname", "available"],
        properties: {
          nickname: { type: "string" },
          available: { type: "boolean" },
        },
      },
      AnniversaryInput: {
        type: "object",
        required: ["title", "targetName", "relation", "date"],
        properties: {
          title: { type: "string", example: "생일" },
          targetName: { type: "string", example: "하원" },
          relation: { type: "string", example: "친구" },
          date: { type: "string", format: "date", example: "2026-06-20" },
          memo: { type: "string", example: "케이크 준비" },
          repeat: { type: "boolean", default: true },
          notificationEnabled: { type: "boolean", default: true },
          notificationDays: {
            type: "array",
            items: { type: "integer", minimum: 0, maximum: 365 },
            example: [7, 3, 0],
          },
        },
      },
      AnniversaryUpdateInput: {
        allOf: [{ $ref: "#/components/schemas/AnniversaryInput" }],
      },
      Anniversary: {
        allOf: [
          { $ref: "#/components/schemas/AnniversaryInput" },
          {
            type: "object",
            required: ["id", "userId", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              nextDate: { type: "string", format: "date" },
              dDay: { type: "integer", example: 10 },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      AnniversaryResponse: {
        type: "object",
        required: ["anniversary"],
        properties: { anniversary: { $ref: "#/components/schemas/Anniversary" } },
      },
      AnniversaryListResponse: {
        type: "object",
        required: ["anniversaries"],
        properties: {
          anniversaries: { type: "array", items: { $ref: "#/components/schemas/Anniversary" } },
        },
      },
      NearestAnniversaryResponse: {
        type: "object",
        required: ["anniversary"],
        properties: {
          anniversary: {
            oneOf: [{ $ref: "#/components/schemas/Anniversary" }, { type: "null" }],
          },
        },
      },
      CalendarResponse: {
        type: "object",
        required: ["year", "month", "anniversaries"],
        properties: {
          year: { type: "integer", example: 2026 },
          month: { type: "integer", example: 6 },
          anniversaries: { type: "array", items: { $ref: "#/components/schemas/Anniversary" } },
        },
      },
      GiftInput: {
        type: "object",
        required: ["age", "gender", "relation", "budgetMax"],
        properties: {
          age: { type: "integer", minimum: 1, maximum: 120, example: 29 },
          gender: { type: "string", example: "여성" },
          relation: { type: "string", example: "친구" },
          occasion: { type: "string", example: "생일" },
          hobbies: { type: "array", items: { type: "string" }, example: ["요가", "독서"] },
          interests: { type: "array", items: { type: "string" }, example: ["향수", "카페"] },
          budgetMin: { type: "integer", minimum: 0, example: 30000 },
          budgetMax: { type: "integer", minimum: 1, example: 80000 },
          mood: { type: "string", example: "감성적인" },
          categories: { type: "array", items: { type: "string" }, example: ["패션", "취미용품"] },
          extraContext: { type: "string", example: "화려한 것보다 오래 쓸 수 있는 물건을 좋아함" },
        },
      },
      GiftRecommendationItem: {
        type: "object",
        required: ["id", "name", "category", "imageUrl", "reason", "price", "ranking", "saved"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          category: { type: "string" },
          imageUrl: { type: "string", format: "uri" },
          reason: { type: "string" },
          price: { type: "integer" },
          ranking: { type: "integer" },
          detail: { type: "string" },
          purchaseUrl: { type: "string", format: "uri" },
          saved: { type: "boolean" },
        },
      },
      GiftRecommendation: {
        type: "object",
        required: ["id", "userId", "input", "items", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          input: { $ref: "#/components/schemas/GiftInput" },
          items: { type: "array", items: { $ref: "#/components/schemas/GiftRecommendationItem" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      GiftRecommendationResponse: {
        type: "object",
        required: ["recommendation"],
        properties: { recommendation: { $ref: "#/components/schemas/GiftRecommendation" } },
      },
      GiftRecommendationListResponse: {
        type: "object",
        required: ["recommendations"],
        properties: {
          recommendations: { type: "array", items: { $ref: "#/components/schemas/GiftRecommendation" } },
        },
      },
      SavedGiftListResponse: {
        type: "object",
        required: ["gifts"],
        properties: {
          gifts: {
            type: "array",
            items: {
              allOf: [
                { $ref: "#/components/schemas/GiftRecommendationItem" },
                {
                  type: "object",
                  properties: {
                    recommendationId: { type: "string", format: "uuid" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              ],
            },
          },
        },
      },
      MessageGenerateInput: {
        type: "object",
        required: ["relation", "situation", "tone"],
        properties: {
          relation: { type: "string", example: "친구" },
          situation: { type: "string", example: "생일" },
          tone: { type: "string", example: "감성적인" },
          targetName: { type: "string", example: "하원" },
          extraContext: { type: "string", example: "오래 알고 지낸 친구" },
        },
      },
      MessageUpdateInput: {
        type: "object",
        properties: {
          favorite: { type: "boolean" },
          content: { type: "string", maxLength: 1000 },
        },
      },
      Message: {
        type: "object",
        required: ["id", "userId", "content", "relation", "situation", "tone", "favorite", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          content: { type: "string" },
          relation: { type: "string" },
          situation: { type: "string" },
          tone: { type: "string" },
          favorite: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MessageResponse: {
        type: "object",
        required: ["message"],
        properties: { message: { $ref: "#/components/schemas/Message" } },
      },
      MessageListResponse: {
        type: "object",
        required: ["messages"],
        properties: {
          messages: { type: "array", items: { $ref: "#/components/schemas/Message" } },
        },
      },
      NotificationSettingsResponse: {
        type: "object",
        required: ["notificationEnabled"],
        properties: { notificationEnabled: { type: "boolean" } },
      },
      Notification: {
        type: "object",
        required: ["anniversaryId", "title", "targetName", "relation", "daysBefore", "notifyDate", "anniversaryDate"],
        properties: {
          anniversaryId: { type: "string", format: "uuid" },
          title: { type: "string" },
          targetName: { type: "string" },
          relation: { type: "string" },
          daysBefore: { type: "integer", example: 7 },
          notifyDate: { type: "string", format: "date" },
          anniversaryDate: { type: "string", format: "date" },
        },
      },
      NotificationListResponse: {
        type: "object",
        required: ["notifications"],
        properties: {
          notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
        },
      },
      UserResponse: {
        type: "object",
        required: ["user"],
        properties: { user: { $ref: "#/components/schemas/User" } },
      },
      UserUpdateInput: {
        type: "object",
        properties: {
          nickname: { type: "string", minLength: 2, maxLength: 20 },
          profileImageUrl: { type: "string", format: "uri", nullable: true },
          notificationEnabled: { type: "boolean" },
        },
      },
    },
  },
} as const;
