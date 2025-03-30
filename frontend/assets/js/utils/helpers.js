/**
 * Helper functions for the game
 */

/**
 * Generate a UUID for player identification
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Format time in seconds to mm:ss format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format distance in meters
 */
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters * 10) / 10}m`;
    } else {
        return `${Math.round(meters / 100) / 10}km`;
    }
}

/**
 * Lerp (linear interpolation) between two values
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Convert from world coordinates to screen coordinates
 */
function worldToScreen(position, camera, renderer) {
    // Create a vector in three.js format
    const vector = new THREE.Vector3(position.x, position.y, position.z);
    
    // Project to screen space
    vector.project(camera);
    
    // Convert to screen coordinates
    const x = (vector.x + 1) * renderer.domElement.width / 2;
    const y = (-vector.y + 1) * renderer.domElement.height / 2;
    
    return { x, y };
}

/**
 * Calculate distance between two 3D points
 */
function distance3D(a, b) {
    return Math.sqrt(
        (a.x - b.x) * (a.x - b.x) +
        (a.y - b.y) * (a.y - b.y) +
        (a.z - b.z) * (a.z - b.z)
    );
}

/**
 * Calculate distance between two 2D points (ignoring y)
 */
function distance2D(a, b) {
    return Math.sqrt(
        (a.x - b.x) * (a.x - b.x) +
        (a.z - b.z) * (a.z - b.z)
    );
}

/**
 * Create a seeded random number generator
 */
function createSeededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

/**
 * Convert vehicle type string to the proper format
 */
function normalizeVehicleType(type) {
    if (!type) return 'default';
    
    const lowerType = type.toLowerCase();
    
    switch (lowerType) {
        case 'sports':
        case 'sport':
            return 'sports';
        case 'truck':
        case 'offroad':
            return 'truck';
        default:
            return 'default';
    }
}

/**
 * Get vehicle color based on type
 */
function getVehicleColor(type) {
    const normalizedType = normalizeVehicleType(type);
    
    // Use constants if available
    if (typeof VEHICLE_TYPES !== 'undefined') {
        const vehicleType = VEHICLE_TYPES[normalizedType.toUpperCase()];
        if (vehicleType && vehicleType.color) {
            return vehicleType.color;
        }
    }
    
    // Fallback colors
    const colors = {
        'default': '#FF5500',
        'sports': '#0055FF',
        'truck': '#005500'
    };
    
    return colors[normalizedType] || colors['default'];
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex value
    const bigint = parseInt(hex, 16);
    
    // Extract RGB components
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return { r, g, b };
}

/**
 * Load an image and return a Promise
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Check if a point is inside a rectangle
 */
function pointInRect(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
}

/**
 * Detect mobile devices
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get the average frame rate
 */
function getAverageFrameRate(frames) {
    if (!frames || frames.length === 0) return 0;
    
    // Calculate sum of frame times
    const sum = frames.reduce((total, frameTime) => total + frameTime, 0);
    
    // Calculate average frame time in milliseconds
    const averageFrameTime = sum / frames.length;
    
    // Convert to FPS (1000ms / averageFrameTime)
    return Math.round(1000 / averageFrameTime);
}

/**
 * Set a cookie
 */
function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
}

/**
 * Get a cookie by name
 */
function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name) {
    setCookie(name, '', -1);
}

/**
 * Detect WebGL support
 */
function isWebGLSupported() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Check if the browser supports the Web Audio API
 */
function isWebAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Check if the browser supports WebSockets
 */
function isWebSocketSupported() {
    return 'WebSocket' in window || 'MozWebSocket' in window;
}