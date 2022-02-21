# Wordle solver

## Usage

<style>
table.wordle {
  border-spacing: 5px;
}
td.hit{
    background-color:darkgreen;
    color: white;
    width: 50px;
    height: 50px;
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    font-family: "Helvetica", sans-serif;
    vertical-align: middle;
}
td.blow{
    background-color: olive;
    color: white;
    width: 50px;
    height: 50px;
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    font-family: "Helvetica", sans-serif;
    vertical-align: middle;
}
td.miss{
    background-color:gray;
    color: white;
    width: 50px;
    height: 50px;
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    font-family: "Helvetica", sans-serif;
    vertical-align: middle;
}
</style>



```
$ python manual.py
Input the reply by Wordle. Green and yellow letters are represented by upper and lower cases, and other (unmatched) letters by other symbols such as '.' or '_'
cubes:...E.
mohel:_oHE_
other:OTHER
$
```
<table class="wordle">
  <tbody>
    <tr>
      <td class="miss">C</td>
      <td class="miss">U</td>
      <td class="miss">B</td>
      <td class="hit">E</td>
      <td class="miss">S</td>
    </tr>
    <tr>
      <td class="miss">M</td>
      <td class="blow">O</td>
      <td class="hit">H</td>
      <td class="hit">E</td>
      <td class="miss">L</td>
    </tr>
    <tr>
      <td class="hit">O</td>
      <td class="hit">T</td>
      <td class="hit">H</td>
      <td class="hit">E</td>
      <td class="hit">R</td>
    </tr>
  </tbody>
</table>
