erDiagram
    %% ==========================================
    %% 1. 基盤・アカウント (Identity)
    %% ==========================================
    Users {
        int id PK
        string name
        string email
        string avatar_url
    }

    Organizations {
        int id PK
        string name
        string description
    }

    OrganizationMembers {
        int id PK
        int user_id FK
        int organization_id FK
        string role
    }

    %% ==========================================
    %% 2. イベントコア (Event Core)
    %% ==========================================
    Events {
        int id PK
        int organization_id FK
        string title
        datetime start_at
        datetime end_at
        string location
        string status
    }

    %% ==========================================
    %% 3. 運営機能 (Operations)
    %% ==========================================
    Tasks {
        int id PK
        int event_id FK
        int assignee_id FK
        string title
        datetime deadline
        string status
        boolean is_ai_generated
    }

    Budgets {
        int id PK
        int event_id FK
        string category
        string type
        int planned_amount
        int actual_amount
    }

    Meetings {
        int id PK
        int event_id FK
        string title
        datetime start_at
        text minutes
    }

    EventStaffs {
        int id PK
        int event_id FK
        int user_id FK
        string role "Admin/Staff/Sponsor"
    }

    %% ==========================================
    %% 4. 参加者管理 (Participants)
    %% ==========================================
    Tickets {
        int id PK
        int event_id FK
        string name
        int price
    }

    EventParticipants {
        int id PK
        int ticket_id FK
        int user_id FK
        string status
    }

    %% ==========================================
    %% 【NEW】5. コミュニケーション (Slack-like Chat)
    %% ==========================================
    Channels {
        int id PK
        int event_id FK "イベントに紐づく"
        string name "例: #general"
        string description
        boolean is_private "鍵付きChか"
        datetime created_at
    }

    ChannelMembers {
        int id PK
        int channel_id FK
        int user_id FK
        datetime joined_at
        datetime last_read_at "既読位置管理用"
    }

    Messages {
        int id PK
        int channel_id FK
        int user_id FK "送信者"
        text content "メッセージ本文"
        int parent_message_id FK "スレッドの親ID (Nullなら親)"
        datetime created_at
        datetime updated_at "編集日時"
        boolean is_deleted "論理削除用"
    }

    %% Relationships Definitions
    Users ||--o{ OrganizationMembers : ""
    Organizations ||--o{ OrganizationMembers : ""
    Organizations ||--o{ Events : ""
    
    Events ||--o{ Tasks : ""
    Events ||--o{ Budgets : ""
    Events ||--o{ Meetings : ""
    
    Events ||--o{ EventStaffs : ""
    Users ||--o{ EventStaffs : ""
    
    Events ||--o{ Tickets : ""
    Tickets ||--o{ EventParticipants : ""
    
    %% Chat Relationships
    Events ||--o{ Channels : "チャンネルを持つ"
    Channels ||--o{ ChannelMembers : "参加者"
    Users ||--o{ ChannelMembers : "参加"
    
    Channels ||--o{ Messages : "メッセージ"
    Users ||--o{ Messages : "送信"
    Messages |o--o{ Messages : "返信(スレッド)"