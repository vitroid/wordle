var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'pages',
        repo: 'https://github.com/vitroid/wordle.git', // Update to point to your repository  
        user: {
            name: 'vitroid', // update to use your name
            email: 'vitroid@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)