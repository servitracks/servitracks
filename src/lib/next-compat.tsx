import React from "react";
import { 
  useNavigate, 
  useLocation, 
  useParams as useReactRouterParams, 
  useSearchParams as useReactRouterSearchParams,
  Link as ReactRouterLink,
  type LinkProps as ReactRouterLinkProps
} from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useParams() {
  return useReactRouterParams();
}

export function useSearchParams() {
  const [searchParams] = useReactRouterSearchParams();
  return searchParams;
}

// Next.js Link compatibility wrapper
export const Link = React.forwardRef<HTMLAnchorElement, Omit<ReactRouterLinkProps, "to"> & { href: string; to?: string }>(
  ({ href, to, ...props }, ref) => {
    return <ReactRouterLink ref={ref} to={to || href} {...props} />;
  }
);
Link.displayName = "Link";
