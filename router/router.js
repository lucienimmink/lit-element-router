import { parseParams, parseQuery, stripExtraTrailingSlash, testRoute } from '../utility/router-utility';

let globalRoutes;
let globalCallback;

let stats = 0;


export function router(routes, callback) {

    if (!stats) {
        window.addEventListener('route', () => {
            router.call(this, globalRoutes, globalCallback);
        })

        window.onpopstate = () => {
            window.dispatchEvent(new CustomEvent('route'));
        }
        stats = 1
    }

    globalRoutes = routes;
    globalCallback = callback;

    const uri = decodeURI(window.location.pathname);
    const querystring = decodeURI(window.location.search);

    let notFoundRoute = routes.filter(route => route.pattern === '*')[0];

    routes = routes.filter(route => route.pattern !== '*' && testRoute(uri, route.pattern));

    if (routes.length) {
        let route = routes[0];
        route.params = parseParams(route.pattern, uri);
        route.query = parseQuery(querystring);

        if (route.guard && typeof route.guard === 'function') {
            const guard = route.guard();

            if (guard instanceof Promise) {

                guard.then((resolved) => {
                    if (resolved) {
                        route.callback && route.callback(route.name, route.params, route.query, route.data)
                        callback(route.name, route.params, route.query, route.data);
                    } else {
                        route.callback && route.callback('not-authorized', route.params, route.query, route.data)
                        callback('not-authorized', {}, {}, {});
                    }
                })
            } else if (typeof guard === 'boolean') {
                route.callback && route.callback(route.name, route.params, route.query, route.data)
                callback(route.name, route.params, route.query, route.data);
            } else {
                route.callback && route.callback('not-authorized', route.params, route.query, route.data)
                callback('not-authorized', {}, {}, {});
            }
        } else {
            route.callback && route.callback(route.name, route.params, route.query, route.data)
            callback(route.name, route.params, route.query, route.data);
        }
    } else if (notFoundRoute) {
        notFoundRoute.callback && notFoundRoute.callback(notFoundRoute.name, {}, {}, {})
        callback(notFoundRoute.name, {}, {}, {});
    } else {
        callback('not-found', {}, {}, {});
    }
}
