public static void Main()
{
    int num = 123;
    num = 123;
    num = 4;
    
    int[][,] arr = { new int[,] {{1 - 1}, {2 - 1}}, new int[,] {{3 + 1}} };
    int[][][] arr2 = { new int[][] {new int[] {1 - 1}, new int[]{2 - 1}}, new int[][] {new int[] {3 + 1}, new int[] {2 - (1 * 1)}} };

    int a = 3, rec = Rec(5);
    Console.WriteLine("Hello World: " + (((rec + a))));

    double[] doubleArr = new double[rec % 8];
    FillDoubleArray(doubleArr);
}

public static int Rec(int a)
{
    if (a == 1)
    {
        return 1;
    }

    if (a % 2 == 0)
    {
        return Rec(a / 2) + 1;
    }

    return Rec(a * 3 + 1) + 1;
}

public static void FillDoubleArray(double[] arr)
{
    for (int i = 0; i < arr.Length; i++)
    {
        arr[i] = i;
    }
}