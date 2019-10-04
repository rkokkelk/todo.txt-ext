# About

Thunderbird extension for the Todo.txt application. This extension tries to integrate the [Todo.txt](http://todotxt.com/) application with Thunderbird. Using the Lightning extension it is now possible to add, delete or modify todo's directly within Thunderbird.

[![Crowdin](https://d322cqt584bo4o.cloudfront.net/todotxt-ext/localized.svg)](https://crowdin.com/project/todotxt-ext)

## Functionality

* Add, delete or modify Todo's from within your Thunderbird.
* Automatically use Thunderbirds functions from Todo.txt, such as categories, priorities, due dates etc.
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

## Building

Use the following steps to build the Todo-txt Thunderbird add-on directly from source code:

```bash
git clone https://github.com/rkokkelk/todo.txt-ext.git
git checkout master # Checkout the specific branch with the source code you want to try
./build -d # -d ensures that debug logs are shown in Thunderbird console
```

These steps results in a file called `todotxt_1.1.0.xpi`, *specific name may change depending on the version of the add-on*. You may install the add-on in Thunderbird by:

1) Open Thunderbird
2) Open the Add-on tab
  * via Properties (triple dashes) -> *Add-ons* -> *Add-ons*
3) Install the add-on
  * Click the properties (Gear icon on top) -> *Install Add-on from File...*
4) After restarting Thunderbird, the Todotxt add-on is available
  * *For debugging output open the Thunderbird console windows, keyboard shortcut (Ctrl - Shift - j).*

# Thanks

This project was made possible of the following projects and persons:

* This extension relies heavily on the [todo-txt-js](https://github.com/roufamatic/todo-txt-js) JavaScript library.
* Much of the code was inspired on the [StormCows](https://github.com/moldybeats/stormcows) extension.
* French translations by L. Lucanakin.
* German translations by N. Reichert
