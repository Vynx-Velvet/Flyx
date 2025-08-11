# Requirements Document

## Introduction

The Flyx media streaming application is experiencing critical media playback errors that prevent users from successfully watching movies and TV shows. The system consists of a VM-based extraction service that scrapes streaming URLs from pirate sites (vidsrc.xyz, embed.su, shadowlandschronicles), a frontend media player using HLS.js for video playback, and a subtitle system that integrates OpenSubtitles API. Users are reporting frequent buffering issues, stream failures, CORS errors, quality switching problems, and subtitle synchronization issues that significantly impact the viewing experience.

## Requirements

### Requirement 1

**User Story:** As a user, I want reliable stream extraction from pirate sites, so that I can consistently access media content without extraction failures.

#### Acceptance Criteria

1. WHEN a user requests a movie or TV episode THEN the system SHALL successfully extract a playable stream URL within 30 seconds
2. WHEN vidsrc.xyz iframe embedding is detected THEN the system SHALL properly navigate through the multi-layered iframe chain (vidsrc.xyz → cloudnestra.com/rcp → cloudnestra.com/prorcp) to extract the actual stream URL
3. WHEN multiple server options are available (CloudStream Pro, 2Embed, Superembed) THEN the system SHALL attempt each server hash in priority order until a working stream is found
4. WHEN extraction encounters anti-bot measures or sandbox detection THEN the system SHALL implement enhanced stealth techniques including proper localStorage settings, user agent spoofing, and realistic play button interaction simulation
5. WHEN cloudnestra.com play button (#pl_but) is detected THEN the system SHALL simulate human-like click interaction to trigger the final iframe loading with the actual video player
6. WHEN shadowlandschronicles URLs are detected THEN the system SHALL handle CORS restrictions through proper proxy configuration
7. WHEN the primary extraction server (vidsrc.xyz) fails THEN the system SHALL automatically fallback to secondary servers (embed.su) within 10 seconds
8. WHEN extraction fails after all retry attempts THEN the system SHALL provide clear error messaging to the user

### Requirement 2

**User Story:** As a user, I want smooth HLS video playback without buffering interruptions, so that I can watch content without constant pauses and quality drops.

#### Acceptance Criteria

1. WHEN HLS stream begins loading THEN the system SHALL start at the highest available quality and maintain it unless network conditions require adjustment
2. WHEN segment loading errors occur THEN the system SHALL skip corrupted segments within 2 seconds and continue playback
3. WHEN buffer stalls are detected THEN the system SHALL perform gap jumping to resume playback within 3 seconds
4. WHEN network errors occur THEN the system SHALL implement progressive recovery strategies before falling back to full restart
5. WHEN quality switching is necessary THEN the system SHALL maintain smooth playback without visible interruptions

### Requirement 3

**User Story:** As a user, I want accurate subtitle synchronization and display, so that I can follow dialogue and understand content in different languages.

#### Acceptance Criteria

1. WHEN subtitles are available from OpenSubtitles API THEN the system SHALL display them synchronized with video playback within 100ms accuracy
2. WHEN subtitle parsing occurs THEN the system SHALL correctly handle VTT format with proper timing conversion
3. WHEN multiple subtitle languages are available THEN the system SHALL allow seamless switching without playback interruption
4. WHEN subtitle content contains HTML tags or formatting THEN the system SHALL properly sanitize and display clean text
5. WHEN subtitle blob URLs are created THEN the system SHALL ensure CORS-free access for reliable loading

### Requirement 4

**User Story:** As a user, I want robust error handling and recovery mechanisms, so that temporary issues don't completely break my viewing experience.

#### Acceptance Criteria

1. WHEN fatal HLS errors occur THEN the system SHALL attempt automatic recovery without user intervention
2. WHEN stream proxy fails THEN the system SHALL retry with alternative proxy configurations or direct access
3. WHEN extraction service becomes unavailable THEN the system SHALL queue requests and retry when service recovers
4. WHEN video element encounters loading errors THEN the system SHALL reinitialize the player with preserved playback position
5. WHEN vidsrc.xyz server hash fails THEN the system SHALL automatically try the next available server hash (CloudStream Pro → 2Embed → Superembed)
6. WHEN cloudnestra.com iframe access is blocked THEN the system SHALL implement alternative iframe navigation strategies including direct hash decoding and prorcp URL construction
7. WHEN multiple consecutive errors occur THEN the system SHALL provide diagnostic information and fallback options

### Requirement 5

**User Story:** As a user, I want optimized streaming performance across different network conditions, so that I can watch content regardless of my internet speed.

#### Acceptance Criteria

1. WHEN network bandwidth is limited THEN the system SHALL adapt quality levels intelligently to prevent buffering
2. WHEN connection is unstable THEN the system SHALL increase buffer size and implement aggressive prefetching
3. WHEN CDN endpoints are slow THEN the system SHALL implement request timeouts and failover mechanisms
4. WHEN mobile network conditions change THEN the system SHALL adjust streaming parameters dynamically
5. WHEN multiple quality levels are available THEN the system SHALL provide manual quality selection with immediate switching

### Requirement 6

**User Story:** As a developer, I want comprehensive logging and monitoring capabilities, so that I can diagnose and fix streaming issues quickly.

#### Acceptance Criteria

1. WHEN streaming errors occur THEN the system SHALL log detailed error information including timestamps, URLs, and context
2. WHEN performance issues are detected THEN the system SHALL track metrics like buffer health, segment load times, and quality switches
3. WHEN extraction fails THEN the system SHALL log the specific failure reason and attempted recovery steps
4. WHEN subtitle issues occur THEN the system SHALL log parsing errors, timing mismatches, and loading failures
5. WHEN user reports issues THEN the system SHALL provide exportable diagnostic logs for troubleshooting