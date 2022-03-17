var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'svelte-static',
        repo: 'https://github.com/vitroid/wordle.git', // Update to point to your repository  
        user: {
            name: 'MM', // update to use your name
            email: 'vitroid@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)