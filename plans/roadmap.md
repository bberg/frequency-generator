# Feature Roadmap: Frequency Generator

## Vision
Make this the definitive frequency/calibration tool on the internet by combining precision tone generation, comprehensive testing tools, and educational content in a modern, accessible interface.

---

## Phase 1: Core Enhancements (Immediate Priority)

### 1.1 Speaker Testing Suite
**Priority: HIGH | Effort: Medium | Impact: High**

#### Stereo Balance Test
- [ ] Add dedicated L/R test mode
- [ ] Visual indicator showing which channel is active
- [ ] Quick toggle between Left, Right, Both
- [ ] Balance slider for fine adjustment

#### Polarity/Phase Test
- [ ] Add polarity test pulse
- [ ] Instructions for proper testing
- [ ] Visual "in-phase" vs "out-of-phase" indicator
- [ ] Educational content about phase issues

#### Subwoofer Test
- [ ] Low-frequency test mode (20-80Hz)
- [ ] Subsonic warning for very low frequencies
- [ ] Bass extension finder

### 1.2 Noise Generator
**Priority: HIGH | Effort: Low | Impact: High**

- [ ] Pink noise (equal energy per octave)
- [ ] White noise (flat frequency response)
- [ ] Brown/red noise (emphasis on low frequencies)
- [ ] Integration with existing volume/channel controls
- [ ] Educational content explaining noise types

### 1.3 Hearing Test Mode
**Priority: HIGH | Effort: Medium | Impact: High**

- [ ] Age-related hearing test (find highest audible frequency)
- [ ] Audiometric test frequencies (125, 250, 500, 1k, 2k, 4k, 8k Hz)
- [ ] Left/Right ear separate testing
- [ ] Simple results display (not medical audiogram)
- [ ] Appropriate disclaimers (not a medical test)
- [ ] Educational content about hearing health

### 1.4 Precision Upgrade
**Priority: MEDIUM | Effort: Low | Impact: Medium**

- [ ] Upgrade from 0.1Hz to 0.01Hz precision
- [ ] Add fine-tuning controls (+/- 0.01Hz buttons)
- [ ] Display more decimal places when appropriate

---

## Phase 2: Advanced Features (Next 30 Days)

### 2.1 Tinnitus Frequency Matcher
**Priority: MEDIUM | Effort: Medium | Impact: Medium**

- [ ] Guided matching workflow
- [ ] Waveform selection (sine, narrow-band noise)
- [ ] Octave check feature (common matching error)
- [ ] Save/export matched frequency
- [ ] Medical disclaimers and professional referral suggestions
- [ ] Links to tinnitus resources

### 2.2 Enhanced Presets
**Priority: MEDIUM | Effort: Low | Impact: Medium**

- [ ] Expand preset categories:
  - Professional calibration (1kHz -20dBFS, etc.)
  - Room acoustics (common room modes)
  - Speaker testing frequencies
  - Subwoofer test points
- [ ] Custom preset save/load (localStorage)
- [ ] Import/export presets

### 2.3 Expanded Educational Content
**Priority: MEDIUM | Effort: Medium | Impact: High**

#### Topics to Cover:
- [ ] How frequency relates to pitch (detailed)
- [ ] Hearing range and age-related loss
- [ ] Speaker/headphone testing guide
- [ ] Calibration procedures for equipment
- [ ] Understanding audio waveforms
- [ ] Room acoustics basics
- [ ] What is tinnitus?
- [ ] Safe listening practices

### 2.4 Results & Export
**Priority: LOW | Effort: Medium | Impact: Medium**

- [ ] Save hearing test results
- [ ] Export sweep data
- [ ] Print-friendly results page
- [ ] Share results (URL parameters)

---

## Phase 3: Pro Features (60+ Days)

### 3.1 Binaural Beats Generator
**Priority: LOW | Effort: Medium | Impact: Low**

- [ ] Two-frequency generator (L/R different frequencies)
- [ ] Preset binaural beat frequencies
- [ ] Educational content about binaural beats

### 3.2 Multi-Tone Mixing
**Priority: LOW | Effort: Medium | Impact: Low**

- [ ] Generate multiple simultaneous tones
- [ ] Harmonic series generator
- [ ] Interval generator (musical intervals)

### 3.3 Test Sequences
**Priority: LOW | Effort: High | Impact: Medium**

- [ ] Programmable test sequences
- [ ] Standard calibration procedures
- [ ] Automated speaker testing routine

### 3.4 Advanced Analysis
**Priority: LOW | Effort: High | Impact: Medium**

- [ ] Microphone input for response testing
- [ ] Real-time frequency analysis
- [ ] Comparison with expected response

---

## Implementation Order (Prioritized)

### Week 1: Core Speaker Tests
1. Stereo Balance Test (L/R toggle with visual)
2. Polarity Test (pulse test)
3. Noise Generator (pink, white, brown)

### Week 2: Hearing Features
4. Hearing Test Mode (age-related frequency test)
5. Improved precision (0.01Hz)
6. Tinnitus Matcher (basic version)

### Week 3: Content & Polish
7. Expanded educational content
8. Enhanced presets
9. UI improvements and testing

### Week 4: Advanced Features
10. Save/export results
11. Additional testing modes
12. Documentation and help

---

## Success Metrics

### User Engagement
- Time on site
- Features used
- Return visits
- Preset usage

### Technical Quality
- Browser compatibility
- Mobile usability
- Page load speed
- Audio quality/precision

### SEO Performance
- Organic search ranking for key terms
- "frequency generator"
- "tone generator online"
- "speaker test"
- "hearing test online"

---

## Technical Considerations

### Performance
- Keep JavaScript bundle small
- Lazy load audio context
- Efficient canvas rendering
- Mobile optimization

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast options
- Clear labeling

### Browser Support
- Chrome, Firefox, Safari, Edge
- iOS Safari (Web Audio API)
- Android Chrome
- Graceful degradation

---

## Competitive Positioning

### vs. WavTones
- Real-time playback (they require download)
- Visualization (they have none)
- Modern interface

### vs. AudioCheck
- Integrated tool (not fragmented pages)
- Free full features (no patron tier)
- Better UX

### vs. Szynalski
- Visualization (they have none)
- Speaker testing features (they have none)
- More comprehensive

### Unique Value
- Only tool combining: precision generation + visualization + speaker testing + hearing test + education
- Modern, accessible interface
- Free, no account required
