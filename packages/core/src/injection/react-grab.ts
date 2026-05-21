export const REACT_GRAB_BRIDGE = `
(function() {
  if (window.__webReaperInjected) return;
  window.__webReaperInjected = true;

  function getReactFiber(element) {
    var keys = Object.keys(element);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('__reactFiber$') || keys[i].startsWith('__reactInternalInstance$')) {
        return element[keys[i]];
      }
    }
    return null;
  }

  function getComponentName(fiber) {
    if (!fiber) return null;
    var current = fiber;
    while (current) {
      if (current.type) {
        if (typeof current.type === 'string') {
          current = current.return;
          continue;
        }
        var name = current.type.displayName || current.type.name;
        if (name && !name.startsWith('_') && name !== 'Fragment') {
          return name;
        }
      }
      current = current.return;
    }
    return null;
  }

  function getSourceInfo(fiber) {
    if (!fiber) return null;
    var current = fiber;
    while (current) {
      if (current._debugSource) {
        return {
          fileName: current._debugSource.fileName,
          lineNumber: current._debugSource.lineNumber,
        };
      }
      current = current.return;
    }
    return null;
  }

  window.__webReaperCaptureElementInfo = function(element) {
    if (!element || !element.tagName) return null;
    var fiber = getReactFiber(element);
    var componentName = getComponentName(fiber);
    var sourceInfo = getSourceInfo(fiber);

    if (componentName) {
      element.setAttribute('data-react-component', componentName);
    }

    return {
      testId: element.getAttribute('data-testid') || element.getAttribute('data-test-id') || undefined,
      role: element.getAttribute('role') || element.tagName.toLowerCase(),
      ariaLabel: element.getAttribute('aria-label') || undefined,
      text: element.textContent ? element.textContent.trim().substring(0, 100) : undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      tagName: element.tagName,
      className: typeof element.className === 'string' ? element.className : undefined,
      id: element.id || undefined,
      componentName: componentName || undefined,
      componentFile: sourceInfo ? sourceInfo.fileName : undefined,
      componentLine: sourceInfo ? sourceInfo.lineNumber : undefined,
    };
  };

  window.__webReaperGetElementInfo = function(selector) {
    var element = document.querySelector(selector);
    if (!element) return null;
    return window.__webReaperCaptureElementInfo(element);
  };

  window.__webReaperGetElementInfoFromPoint = function(x, y) {
    var element = document.elementFromPoint(x, y);
    if (!element) return null;
    return window.__webReaperCaptureElementInfo(element);
  };

  console.log('[web-reaper] Injection loaded');
})();
`;
