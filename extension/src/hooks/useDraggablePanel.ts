import { useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import { storageService } from '../services/storageService';

const POSITION_STORAGE_KEY = 'nexvora_panel_position';

export function useDraggablePanel() {
  const position = useUiStore((state) => state.position);
  const setPosition = useUiStore((state) => state.setPosition);
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Load persistent coordinates on initial mount
  useEffect(() => {
    const loadSavedPosition = async () => {
      const saved = await storageService.getItem<{ x: number; y: number } | null>(POSITION_STORAGE_KEY, null);
      if (saved) {
        setPosition(saved);
      }
    };
    loadSavedPosition();
  }, [setPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow dragging via headers or specific handle areas, not buttons/checkboxes
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('a') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: position.x, y: position.y };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position, setPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newX = initialPosRef.current.x + deltaX;
    const newY = initialPosRef.current.y + deltaY;

    // Apply strict boundaries to keep panel fully inside Google Maps window bounds
    const maxBoundaryX = window.innerWidth - 460;
    const maxBoundaryY = window.innerHeight - 300;
    
    // We let it drag relative to top/right default positions:
    // x: negative shifts left, positive shifts right
    // y: negative shifts up, positive shifts down
    const boundedX = Math.min(30, Math.max(-window.innerWidth + 460, newX));
    const boundedY = Math.min(window.innerHeight - 200, Math.max(-180, newY));

    setPosition({ x: boundedX, y: boundedY });
  }, [setPosition]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Persist position in storage memory
    const currentPosition = useUiStore.getState().position;
    storageService.setItem(POSITION_STORAGE_KEY, currentPosition);
  }, [handleMouseMove]);

  // Clean up event listeners if unmounted unexpectedly during drag
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    position,
    onMouseDown: handleMouseDown,
  };
}
