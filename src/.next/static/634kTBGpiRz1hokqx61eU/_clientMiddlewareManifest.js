self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api|admin|_next|_vercel|.*\\.(?:css|js|map|json|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|otf|mp4|webm|pdf)$).*))(\\\\.json)?[\\/#\\?]?$",
    "originalSource": "/((?!api|admin|_next|_vercel|.*\\.(?:css|js|map|json|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|otf|mp4|webm|pdf)$).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()