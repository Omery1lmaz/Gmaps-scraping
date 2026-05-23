import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  pathname: string;
  search: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    
    const handleCustomNavigate = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener('pushstate-changed', handleCustomNavigate);
    window.addEventListener('replacestate-changed', handleCustomNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pushstate-changed', handleCustomNavigate);
      window.removeEventListener('replacestate-changed', handleCustomNavigate);
    };
  }, []);

  const navigate = (path: string, options?: { replace?: boolean }) => {
    if (window.location.pathname + window.location.search !== path) {
      if (options?.replace) {
        window.history.replaceState(null, '', path);
        window.dispatchEvent(new Event('replacestate-changed'));
      } else {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new Event('pushstate-changed'));
      }
    }
  };

  return (
    <RouterContext.Provider value={{ pathname, search, navigate, params: {} }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useLocation must be used within a BrowserRouter');
  }
  return { pathname: context.pathname, search: context.search };
}

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within a BrowserRouter');
  }
  return context.navigate;
}

export function useParams(): Record<string, string> {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useParams must be used within a BrowserRouter');
  }
  return context.params;
}

// Helper: match a route pattern like "/sequences/:id" against a pathname like "/sequences/abc123"
function matchPath(pattern: string, pathname: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].substring(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return { match: false, params: {} };
    }
  }

  return { match: true, params };
}

interface RoutesProps {
  children: React.ReactNode;
}

export function Routes({ children }: RoutesProps) {
  const { pathname } = useLocation();
  let matchedElement: React.ReactNode = null;
  let matchedParams: Record<string, string> = {};

  React.Children.forEach(children, (child) => {
    if (matchedElement) return;
    if (!React.isValidElement(child)) return;

    const { path } = child.props as any;
    if (!path) return;

    // Exact match
    if (path === pathname) {
      matchedElement = child;
      matchedParams = {};
      return;
    }

    // Parameterized match
    if (path.includes(':')) {
      const result = matchPath(path, pathname);
      if (result.match) {
        matchedElement = child;
        matchedParams = result.params;
      }
    }
  });

  if (!matchedElement) return null;

  return (
    <ParamsProvider params={matchedParams}>
      {matchedElement}
    </ParamsProvider>
  );
}

function ParamsProvider({ params, children }: { params: Record<string, string>; children: React.ReactNode }) {
  const parentContext = useContext(RouterContext);
  if (!parentContext) return <>{children}</>;

  return (
    <RouterContext.Provider value={{ ...parentContext, params }}>
      {children}
    </RouterContext.Provider>
  );
}

interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export function Route({ element }: RouteProps) {
  return <>{element}</>;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: React.ReactNode;
}

export function Link({ to, children, className, ...props }: LinkProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}

export function Navigate({ to }: { to: string }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);

  return null;
}
