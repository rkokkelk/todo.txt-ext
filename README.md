# About

Thunderbird extension for the Todo.txt application. This extension tries to integrate the [Todo.txt](http://todotxt.com/) application with Thunderbird. Using the Lightning extension it is now possible to add, delete or modify todo's directly within Thunderbird.

## Functionality

* Add, delete or modify Todo's from within your Thunderbird.
* Automatically use Thunderbirds functions from Todo.txt, such as categories ,priorities, due dates etc.
* Get a quick overview of all your tasks.
* Search for complete and incomplete Todo's within Thunderbird using search parameters such as Contexts or Projects.
* Use Todo.txt's syntax directly within Thunderbird.
* Show todo's in plaintext or using the Thunderbird functionality.

## Mozilla

Further information and usage statistics can be found at [Mozzila](https://addons.mozilla.org/en-US/thunderbird/addon/todotxt-extension/).

# Usage

The extension requires the following options:

1. Location of your Todo.txt file
2. Location of your Done.txt file

After this configuration it is possible to see every finished and incomplete tasks and add, delete or modify them accordingly. 

## Syntax

The extension can automatically assign the appropriate properties to a Thunderbird task based on the Todo.txt syntax. This means that when a user enters a new Task with Todo.txt syntax it will result in a correct Thunderbird task.

For example:
`(A) foobar +Dev +Home @PR`

Entered as a new task within Thunderbird, it will automatically have the following properties:
* High priority
* Categories set to *DEV* & *Home*
* Title containing *foobar*
* Location set to *@PR*

Offcourse the Todo.txt file will contain the exact line as entered into Thunderbird including a creation date.

# Thanks

This project was made possible of the following projects:

* This extension relies heavily on the [todo-txt-js](https://github.com/roufamatic/todo-txt-js) JavaScript library.
* Much of the code was inspired on the [StormCows](https://github.com/moldybeats/stormcows) extension.
