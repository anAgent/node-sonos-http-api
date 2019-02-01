module.exports = function(api) {
    const isProd = process.env.NODE_ENV.indexOf('prod') > -1;
    // TODO: Make this work better ... or correct!
    const presets = [
        "@babel/preset-flow",
        "@babel/env"
    ];

    // The API exposes the following:
    // If testing for a specific env, we recommend specifics to avoid instantiating a plugin for
    // any possible NODE_ENV value that might come up during plugin execution.

    //var isProd = api.cache(() => process.env.NODE_ENV === "production");
    // Note, we also expose the following more-verbose versions of the above examples:
    //api.cache.forever(); // api.cache(true)
   //api.cache.never();   // api.cache(false)
    //api.cache.using(); // api.cache(fn)

    // Return the value that will be cached.
    api.cache(() => process.env.NODE_ENV === "production");

    if(isProd) {
        presets.push('minify');
    }

    return {
        presets:[
            "@babel/preset-flow",
            "@babel/env"
        ],
        env: {
            production: {
                "presets": ["minify"]
            }
        }
    };
};

