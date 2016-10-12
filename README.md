# gitrat

Log your last build on GitLab CI. May be useful for beep notification or running another script after build is finished.

## Instalation

```
npm install -g gitrat
```

## Usage
First you have to set provide your GitLab private token. We use it for access to list of your projects and builds.


```
gitrat token private_token
```

Second you have to create `rat.json` files in your projects directory.

```json
{
    "projectName": "my-project-name"
}
```

* `projectName` is name of your project on GitLab.
* `OPTIONAL` | `projectId`, id of your project, if not specified it will be written by `gitrat` after first usage.

Now you can look for your build status. If build is finished it will print it, but if build is running or pending it will watch for change and print result if finished. It may be useful if you have long builds and want go watch some kittens online waiting for your CI. Just push your changes and set `gitrat`. We'll notify you:

```
gitrat && beep(tput bel)
```

## Licence 

MIT License

Copyright (c) 2016 Tomasz Cichocinski
