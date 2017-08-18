# Getting Started

We use [`phpcs` (PHP_CodeSniffer)](https://github.com/squizlabs/PHP_CodeSniffer) with the [WordPress Coding Standards ruleset](https://github.com/WordPress-Coding-Standards/WordPress-Coding-Standards) to run a lot of automated checks against all PHP code in this project. This ensures that we are consistent with WordPress PHP coding standards.

When making any changes to the PHP code in this project, it's recommended to install and run `phpcs` on your computer. This is a step in our Travis CI build as well, but it is better to catch errors locally.

- Install [Composer](https://getcomposer.org/download/) on your computer
- Run `composer install` in the command line. Or if you need to update some dependencies, run `composer update --lock`
- Run `composer phpcs` to show all errors
- Run `composer phpcbf` to fix all errors
- How to set up it in PhpStorm [see here](https://confluence.jetbrains.com/display/PhpStorm/PHP+Code+Sniffer+in+PhpStorm#PHPCodeSnifferinPhpStorm-1.EnablePHPCodeSnifferintegrationinPhpStorm)