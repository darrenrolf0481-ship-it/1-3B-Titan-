# Bolt's Performance Journal

## 2025-05-18 - CSS Keyframe Loop vs. JS Timer State Churn in React Background Components
**Learning:** Background visual effects (like smoke particles) that use dynamic JS timers (`setInterval`/`setTimeout`) to add/remove DOM nodes cause continuous React re-renders, layout thrashing, and memory leaks when unmounted without cleanup.
**Action:** Replace JS timer-driven particle lifecycles with static particle pools using CSS keyframe infinite animations (`animation-iteration-count: infinite`) and negative animation delays. This offloads visual movement to the browser compositor thread with 0 React state updates.
